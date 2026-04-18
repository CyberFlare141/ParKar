<?php

namespace App\Http\Controllers;

use App\Http\Services\Ai\AiDocumentService;
use App\Models\AiAnalysis;
use App\Models\ApplicationDocument;
use App\Models\Document;
use App\Models\ParkingApplication;
use App\Models\Semester;
use App\Models\Vehicle;
use App\Support\NotificationPublisher;
use DateTimeInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class StudentParkingApplicationController extends Controller
{
    private const RENEWAL_NOTE_PREFIX = 'Renewal Meta:';
    private const STUDY_SEMESTERS = [
        '1.1',
        '1.2',
        '2.1',
        '2.2',
        '3.1',
        '3.2',
        '4.1',
        '4.2',
        '5.1',
        '5.2',
    ];

    private const DOCUMENT_FIELD_TO_TYPE = [
        'vehicle_registration_certificate' => 'registration',
        'driving_license' => 'license',
        'university_id_card' => 'id_card',
        'vehicle_photo' => 'vehicle_photo',
    ];

    private const AI_REQUIRED_CAR_DOCUMENT_TYPES = [
        'registration',
        'license',
    ];

    public function __construct(private readonly AiDocumentService $aiDocumentService)
    {
    }

    public function semesters(): JsonResponse
    {
        $semesters = Semester::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'start_date', 'end_date']);

        return response()->json([
            'data' => $semesters,
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $activeSemester = Semester::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->first(['id', 'name', 'start_date', 'end_date', 'vehicle_quota', 'semester_fee']);

        $applications = ParkingApplication::query()
            ->with([
                'semester:id,name,start_date,end_date',
                'vehicle:id,plate_number,vehicle_type,brand,model,color,registration_number',
                'documents:id,document_type,file_path,is_verified,created_at',
                'parkingTicket:id,ticket_id,application_id,issue_date,parking_slot',
            ])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        $renewalContext = $this->buildRenewalContext($applications);

        $vehicles = Vehicle::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get([
                'id',
                'plate_number',
                'vehicle_type',
                'brand',
                'model',
                'color',
                'registration_number',
                'created_at',
            ]);

        $documents = Document::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get([
                'id',
                'document_type',
                'file_path',
                'is_verified',
                'created_at',
            ]);

        $latestApplication = $applications->first();

        return response()->json([
            'data' => [
                'student' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'university_id' => $user->university_id,
                    'department' => $user->department,
                    'role' => $user->role,
                    'email_verified_at' => $this->toIsoString($user->email_verified_at),
                ],
                'active_semester' => $activeSemester ? [
                    'id' => $activeSemester->id,
                    'name' => $activeSemester->name,
                    'start_date' => $activeSemester->start_date,
                    'end_date' => $activeSemester->end_date,
                    'vehicle_quota' => $activeSemester->vehicle_quota,
                    'semester_fee' => $activeSemester->semester_fee,
                ] : null,
                'overview' => [
                    'total_applications' => $applications->count(),
                    'approved_applications' => $applications->where('status', 'approved')->count(),
                    'pending_applications' => $applications->where('status', 'pending')->count(),
                    'rejected_applications' => $applications->where('status', 'rejected')->count(),
                    'total_vehicles' => $vehicles->count(),
                    'total_documents' => $documents->count(),
                    'verified_documents' => $documents->where('is_verified', true)->count(),
                ],
                'latest_application' => $latestApplication
                    ? $this->toStudentApplicationSummary($latestApplication, $renewalContext)
                    : null,
                'recent_applications' => $applications
                    ->take(5)
                    ->map(fn (ParkingApplication $application): array => $this->toStudentApplicationSummary($application, $renewalContext))
                    ->values(),
                'application_history' => $applications
                    ->map(fn (ParkingApplication $application): array => $this->toStudentApplicationSummary($application, $renewalContext))
                    ->values(),
                'vehicles' => $vehicles->map(fn (Vehicle $vehicle): array => [
                    'id' => $vehicle->id,
                    'plate_number' => $vehicle->plate_number,
                    'vehicle_type' => $vehicle->vehicle_type,
                    'brand' => $vehicle->brand,
                    'model' => $vehicle->model,
                    'color' => $vehicle->color,
                    'registration_number' => $vehicle->registration_number,
                    'created_at' => $this->toIsoString($vehicle->created_at),
                ])->values(),
                'documents' => $documents->map(fn (Document $document): array => [
                    'id' => $document->id,
                    'document_type' => $document->document_type,
                    'file_path' => $document->file_path,
                    'is_verified' => (bool) $document->is_verified,
                    'created_at' => $this->toIsoString($document->created_at),
                ])->values(),
            ],
        ]);
    }

    public function renew(Request $request, ParkingApplication $parkingApplication): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $sourceApplication = ParkingApplication::query()
            ->with([
                'documents:id,document_type,file_path,is_verified,created_at',
                'vehicle:id,plate_number,vehicle_type,brand,model,color,registration_number',
            ])
            ->whereKey($parkingApplication->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$sourceApplication) {
            return response()->json([
                'message' => 'Application not found.',
            ], 404);
        }

        if (!in_array($sourceApplication->status, ['approved', 'active'], true)) {
            return response()->json([
                'message' => 'Only approved applications can be renewed.',
            ], 422);
        }

        $payload = $request->validate([
            'document_mode' => ['required', 'in:keep,update,add'],
            'acknowledged' => ['required', 'boolean'],
            'review_note' => ['nullable', 'string', 'max:2000'],
            'documents' => ['nullable', 'array'],
            'documents.vehicle_registration_certificate' => [
                'nullable',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:5120',
            ],
            'documents.driving_license' => [
                'nullable',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:5120',
            ],
            'documents.university_id_card' => [
                'nullable',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:5120',
            ],
            'documents.vehicle_photo' => [
                'nullable',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:5120',
            ],
        ]);

        if (!(bool) $payload['acknowledged']) {
            return response()->json([
                'message' => 'Please confirm the renewal summary before submitting.',
            ], 422);
        }

        $uploadedFields = collect(self::DOCUMENT_FIELD_TO_TYPE)
            ->keys()
            ->filter(fn (string $field): bool => $request->hasFile("documents.$field"))
            ->values()
            ->all();

        if ($payload['document_mode'] === 'update' && $uploadedFields === []) {
            return response()->json([
                'message' => 'Upload at least one replacement document or keep the existing files.',
            ], 422);
        }

        if ($payload['document_mode'] === 'add' && $uploadedFields === []) {
            return response()->json([
                'message' => 'Add at least one supporting document before continuing.',
            ], 422);
        }

        $storedPaths = [];

        try {
            DB::beginTransaction();

            $allApplications = ParkingApplication::query()
                ->where('user_id', $user->id)
                ->orderBy('id')
                ->get();

            $renewalContext = $this->buildRenewalContext($allApplications);
            $sourceMeta = $renewalContext[$sourceApplication->id] ?? [
                'is_renewal' => false,
                'renewal_source_application_id' => null,
                'renewal_sequence' => null,
                'renewal_count' => 0,
                'last_renewed_at' => null,
            ];
            $rootApplicationId = (int) ($sourceMeta['renewal_source_application_id'] ?: $sourceApplication->id);
            $nextSequence = (int) ($renewalContext[$rootApplicationId]['renewal_count'] ?? 0) + 1;
            $semester = $this->resolveSubmissionSemester();

            $renewalApplication = ParkingApplication::query()->create([
                'user_id' => $user->id,
                'semester_id' => $semester->id,
                'vehicle_id' => $sourceApplication->vehicle_id,
                'status' => 'pending',
                'register_as' => (string) $user->role,
                'applicant_name' => (string) $sourceApplication->applicant_name,
                'applicant_university_id' => (string) $sourceApplication->applicant_university_id,
                'applicant_email' => (string) $sourceApplication->applicant_email,
                'applicant_phone' => (string) $sourceApplication->applicant_phone,
                'notes' => $this->buildRenewalNotes(
                    $payload['document_mode'],
                    $rootApplicationId,
                    $nextSequence,
                    isset($payload['review_note']) ? trim((string) $payload['review_note']) : ''
                ),
                'nda_signed' => (bool) $sourceApplication->nda_signed,
            ]);

            $existingDocuments = $sourceApplication->documents->keyBy('document_type');
            $attachedDocumentIds = [];

            foreach (self::DOCUMENT_FIELD_TO_TYPE as $field => $documentType) {
                $hasUpload = $request->hasFile("documents.$field");

                if ($hasUpload) {
                    $file = $request->file("documents.$field");
                    $path = $file->store("parking-documents/{$user->id}", 'public');
                    $storedPaths[] = $path;

                    $document = Document::query()->create([
                        'user_id' => $user->id,
                        'document_type' => $documentType,
                        'file_path' => $path,
                        'is_verified' => false,
                    ]);

                    $attachedDocumentIds[] = (int) $document->id;
                    continue;
                }

                if ($existingDocuments->has($documentType)) {
                    $attachedDocumentIds[] = (int) $existingDocuments[$documentType]->id;
                }
            }

            foreach (array_values(array_unique($attachedDocumentIds)) as $documentId) {
                ApplicationDocument::query()->create([
                    'application_id' => $renewalApplication->id,
                    'document_id' => $documentId,
                    'created_at' => now(),
                ]);
            }

            DB::commit();

            NotificationPublisher::createForUser(
                $user->id,
                'Renewal submitted',
                "Your renewal request for application #{$rootApplicationId} has been submitted and is now pending review."
            );
            NotificationPublisher::createForRole(
                'admin',
                'New renewal request',
                "{$user->name} submitted renewal request #{$renewalApplication->id} for application #{$rootApplicationId}."
            );

            return response()->json([
                'message' => 'Renewal submitted successfully.',
                'data' => [
                    'application_id' => $renewalApplication->id,
                    'status' => $renewalApplication->status,
                ],
            ], 201);
        } catch (Throwable $exception) {
            DB::rollBack();

            foreach ($storedPaths as $storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            report($exception);

            return response()->json([
                'message' => 'Failed to submit renewal. Please try again.',
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $isTeacher = $user->role === 'teacher';

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'aust_id' => ['required', 'string', 'max:50'],
            'study_semester' => $isTeacher
                ? ['nullable', 'string', 'max:50']
                : ['required', 'in:' . implode(',', self::STUDY_SEMESTERS)],
            'department' => $isTeacher
                ? ['required', 'string', 'max:255']
                : ['nullable', 'string', 'max:255'],
            'academic_role' => $isTeacher
                ? ['required', 'in:lecturer,professor,associate_professor,adjunct_professor']
                : ['nullable', 'string', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'contact_phone' => ['required', 'string', 'max:20'],
            'vehicle_plate' => ['required', 'string', 'max:20'],
            'vehicle_type' => ['required', 'in:car,motorcycle,other'],
            'vehicle_model' => ['required', 'string', 'max:120'],
            'vehicle_color' => ['required', 'string', 'max:50'],
            'vehicle_brand' => ['required', 'string', 'max:120'],
            'registration_number' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'nda_signed' => ['required', 'boolean'],
            'documents' => ['required', 'array'],
            'documents.vehicle_registration_certificate' => [
                'required',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:5120',
            ],
            'documents.driving_license' => [
                'required',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:5120',
            ],
            'documents.university_id_card' => [
                'required',
                'file',
                'mimetypes:application/pdf,image/jpeg,image/png',
                'max:5120',
            ],
            'documents.vehicle_photo' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png',
                'max:5120',
            ],
        ]);

        $semester = $this->resolveSubmissionSemester();

        $aiResultsByField = [];
        $rejections = [];

        foreach (self::DOCUMENT_FIELD_TO_TYPE as $field => $documentType) {
            $file = $request->file("documents.$field");
            $result = $this->aiDocumentService->analyse($file);
            $aiResultsByField[$field] = [
                'field' => $field,
                'document_type' => $documentType,
                'is_car_document' => (bool) ($result['is_car_document'] ?? false),
                'clarity' => (string) ($result['clarity'] ?? 'unclear'),
                'confidence' => round((float) ($result['confidence'] ?? 0), 4),
                'issues' => array_values(array_map('strval', (array) ($result['issues'] ?? []))),
                'error' => isset($result['error']) && $result['error'] !== null
                    ? (string) $result['error']
                    : null,
            ];

            $hasServiceError = !empty($aiResultsByField[$field]['error']);
            $clarity = $aiResultsByField[$field]['clarity'];
            $issues = $aiResultsByField[$field]['issues'];

            if (!$hasServiceError && $clarity === 'unclear') {
                $rejections[] = [
                    'field' => $field,
                    'document_type' => $documentType,
                    'reason' => 'Image quality issues: ' . ($issues ? implode(', ', $issues) : 'unclear image'),
                ];
            }

            if (
                !$hasServiceError
                && in_array($documentType, self::AI_REQUIRED_CAR_DOCUMENT_TYPES, true)
                && !$aiResultsByField[$field]['is_car_document']
            ) {
                $rejections[] = [
                    'field' => $field,
                    'document_type' => $documentType,
                    'reason' => 'The uploaded file does not appear to be a valid car document.',
                ];
            }
        }

        if ($rejections !== []) {
            return response()->json([
                'message' => 'One or more documents failed AI verification. Please re-upload clearer images.',
                'rejections' => $rejections,
                'ai_verification' => $this->buildAiVerificationPayload($aiResultsByField, false, true),
            ], 422);
        }

        $storedPaths = [];

        $application = null;

        try {
            DB::beginTransaction();

            $user->forceFill([
                'name' => trim((string) $payload['name']),
                'email' => strtolower(trim((string) $payload['email'])),
                'phone' => trim((string) $payload['contact_phone']),
                'university_id' => trim((string) $payload['aust_id']),
                'department' => $isTeacher
                    ? trim((string) $payload['department'])
                    : $user->department,
            ])->save();

            $vehicle = Vehicle::query()->create([
                'user_id' => $user->id,
                'plate_number' => strtoupper(trim((string) $payload['vehicle_plate'])),
                'vehicle_type' => $payload['vehicle_type'],
                'brand' => trim((string) $payload['vehicle_brand']),
                'model' => trim((string) $payload['vehicle_model']),
                'color' => trim((string) $payload['vehicle_color']),
                'registration_number' => trim((string) $payload['registration_number']),
            ]);

            $application = ParkingApplication::query()->create([
                'user_id' => $user->id,
                'semester_id' => $semester->id,
                'vehicle_id' => $vehicle->id,
                'status' => 'pending',
                'register_as' => (string) $user->role,
                'applicant_name' => trim((string) $payload['name']),
                'applicant_university_id' => trim((string) $payload['aust_id']),
                'applicant_email' => strtolower(trim((string) $payload['email'])),
                'applicant_phone' => trim((string) $payload['contact_phone']),
                'notes' => $this->buildStoredNotes($payload),
                'nda_signed' => (bool) $payload['nda_signed'],
            ]);

            foreach (self::DOCUMENT_FIELD_TO_TYPE as $field => $documentType) {
                $file = $request->file("documents.$field");
                $path = $file->store("parking-documents/{$user->id}", 'public');
                $storedPaths[] = $path;

                $document = Document::query()->create([
                    'user_id' => $user->id,
                    'document_type' => $documentType,
                    'file_path' => $path,
                    'is_verified' => false,
                ]);

                ApplicationDocument::query()->create([
                    'application_id' => $application->id,
                    'document_id' => $document->id,
                    'created_at' => now(),
                ]);
            }

            DB::commit();

            $this->storeAiAnalysis($application->id, $aiResultsByField);
            NotificationPublisher::createForUser(
                $user->id,
                'Application submitted',
                "Your parking application #{$application->id} has been submitted and is now pending review."
            );
            NotificationPublisher::createForRole(
                'admin',
                'New parking application',
                "{$user->name} submitted parking application #{$application->id} for review."
            );

            return response()->json([
                'message' => 'Parking application submitted successfully.',
                'data' => [
                    'application_id' => $application->id,
                    'status' => $application->status,
                    'ai_verification' => $this->buildAiVerificationPayload($aiResultsByField, true, false),
                ],
            ], 201);
        } catch (Throwable $exception) {
            DB::rollBack();

            foreach ($storedPaths as $storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            report($exception);

            return response()->json([
                'message' => 'Failed to submit parking application. Please try again.',
            ], 500);
        }
    }

    private function storeAiAnalysis(int $applicationId, array $aiResultsByField): void
    {
        try {
            AiAnalysis::query()->create([
                'application_id' => $applicationId,
                'risk_score' => $this->calculateRiskScore($aiResultsByField),
                'renewal_recommendation' => false,
                'raw_response' => $aiResultsByField,
            ]);
        } catch (Throwable $exception) {
            Log::warning('Failed to persist AI analysis for parking application.', [
                'application_id' => $applicationId,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    private function buildAiVerificationPayload(array $resultsByField, bool $passed, bool $rejected): array
    {
        $documents = array_values(array_map(
            fn (array $result): array => [
                'field' => $result['field'],
                'document_type' => $result['document_type'],
                'is_car_document' => $result['is_car_document'],
                'clarity' => $result['clarity'],
                'confidence' => $result['confidence'],
                'issues' => $result['issues'],
                'error' => $result['error'],
            ],
            $resultsByField
        ));

        $hasManualReview = collect($documents)->contains(
            fn (array $document): bool => !empty($document['error'])
        );

        return [
            'passed' => $passed,
            'rejected' => $rejected,
            'manual_review' => $hasManualReview,
            'summary' => $documents,
        ];
    }

    private function calculateRiskScore(array $resultsByField): float
    {
        if ($resultsByField === []) {
            return 0.0;
        }

        $totalRisk = collect($resultsByField)->sum(function (array $result): float {
            $confidenceRisk = 1 - max(0, min(1, (float) $result['confidence']));
            $issueRisk = min(0.35, count($result['issues']) * 0.08);
            $manualReviewRisk = !empty($result['error']) ? 0.2 : 0.0;

            return min(1, $confidenceRisk + $issueRisk + $manualReviewRisk);
        });

        return round($totalRisk / count($resultsByField), 4);
    }

    private function buildStoredNotes(array $payload): ?string
    {
        $parts = [];

        $department = trim((string) ($payload['department'] ?? ''));
        $academicRole = trim((string) ($payload['academic_role'] ?? ''));
        $studySemester = trim((string) ($payload['study_semester'] ?? ''));

        if ($department !== '') {
            $parts[] = 'Department: ' . $department;
        }

        if ($academicRole !== '') {
            $parts[] = 'Academic Role: ' . str_replace('_', ' ', $academicRole);
        }

        if ($studySemester !== '') {
            $parts[] = 'Study Semester: ' . $studySemester;
        }

        $notes = isset($payload['notes']) ? trim((string) $payload['notes']) : '';
        if ($notes !== '') {
            $parts[] = 'Notes: ' . $notes;
        }

        return implode(PHP_EOL, $parts);
    }

    private function resolveSubmissionSemester(): Semester
    {
        $semester = Semester::query()
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->first();

        if ($semester) {
            return $semester;
        }

        $year = (int) now()->format('Y');

        return Semester::query()->create([
            'name' => "Auto Semester {$year}",
            'start_date' => "{$year}-01-01",
            'end_date' => "{$year}-12-31",
            'vehicle_quota' => 1,
            'semester_fee' => 0,
            'is_active' => true,
        ]);
    }

    private function toStudentApplicationSummary(ParkingApplication $application, array $renewalContext = []): array
    {
        $renewalMeta = $renewalContext[$application->id] ?? [
            'is_renewal' => false,
            'renewal_source_application_id' => null,
            'renewal_sequence' => null,
            'renewal_count' => 0,
            'last_renewed_at' => null,
        ];

        return [
            'id' => $application->id,
            'status' => $application->status,
            'created_at' => $this->toIsoString($application->created_at),
            'reviewed_at' => $this->toIsoString($application->reviewed_at),
            'admin_comment' => $application->admin_comment,
            'is_renewal' => (bool) $renewalMeta['is_renewal'],
            'renewal_source_application_id' => $renewalMeta['renewal_source_application_id'],
            'renewal_sequence' => $renewalMeta['renewal_sequence'],
            'renewal_count' => $renewalMeta['renewal_count'],
            'last_renewed_at' => $renewalMeta['last_renewed_at'],
            'semester' => $application->semester ? [
                'id' => $application->semester->id,
                'name' => $application->semester->name,
                'start_date' => $application->semester->start_date,
                'end_date' => $application->semester->end_date,
            ] : null,
            'vehicle' => $application->vehicle ? [
                'id' => $application->vehicle->id,
                'plate_number' => $application->vehicle->plate_number,
                'vehicle_type' => $application->vehicle->vehicle_type,
                'brand' => $application->vehicle->brand,
                'model' => $application->vehicle->model,
                'color' => $application->vehicle->color,
                'registration_number' => $application->vehicle->registration_number,
            ] : null,
            'ticket' => $application->parkingTicket ? [
                'ticket_id' => $application->parkingTicket->ticket_id,
                'issue_date' => $this->toIsoString($application->parkingTicket->issue_date),
                'parking_slot' => $application->parkingTicket->parking_slot,
            ] : null,
            'documents' => $application->documents->map(fn (Document $document): array => [
                'id' => $document->id,
                'document_type' => $document->document_type,
                'is_verified' => (bool) $document->is_verified,
                'created_at' => $this->toIsoString($document->created_at),
            ])->values(),
        ];
    }

    private function buildRenewalNotes(
        string $documentMode,
        int $rootApplicationId,
        int $renewalSequence,
        string $reviewNote,
    ): string {
        $lines = [
            self::RENEWAL_NOTE_PREFIX,
            "source_application_id={$rootApplicationId}",
            "renewal_sequence={$renewalSequence}",
            "document_mode={$documentMode}",
        ];

        if ($reviewNote !== '') {
            $lines[] = "review_note={$reviewNote}";
        }

        return implode(PHP_EOL, $lines);
    }

    private function parseRenewalMetadata(?string $notes): array
    {
        $normalized = trim((string) $notes);
        if ($normalized === '' || !str_starts_with($normalized, self::RENEWAL_NOTE_PREFIX)) {
            return [
                'is_renewal' => false,
                'renewal_source_application_id' => null,
                'renewal_sequence' => null,
                'document_mode' => null,
                'review_note' => null,
            ];
        }

        $metadata = [
            'is_renewal' => true,
            'renewal_source_application_id' => null,
            'renewal_sequence' => null,
            'document_mode' => null,
            'review_note' => null,
        ];

        foreach (preg_split('/\R+/', $normalized) as $line) {
            if (!str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = array_map('trim', explode('=', $line, 2));
            if ($key === 'source_application_id') {
                $metadata['renewal_source_application_id'] = (int) $value;
            } elseif ($key === 'renewal_sequence') {
                $metadata['renewal_sequence'] = (int) $value;
            } elseif ($key === 'document_mode') {
                $metadata['document_mode'] = $value;
            } elseif ($key === 'review_note') {
                $metadata['review_note'] = $value;
            }
        }

        return $metadata;
    }

    private function buildRenewalContext($applications): array
    {
        $context = [];
        $renewalGroups = [];

        foreach ($applications as $application) {
            $parsed = $this->parseRenewalMetadata($application->notes);
            $context[$application->id] = [
                'is_renewal' => (bool) $parsed['is_renewal'],
                'renewal_source_application_id' => $parsed['renewal_source_application_id'],
                'renewal_sequence' => $parsed['renewal_sequence'],
                'renewal_count' => 0,
                'last_renewed_at' => null,
            ];

            if ($parsed['is_renewal'] && $parsed['renewal_source_application_id']) {
                $renewalGroups[$parsed['renewal_source_application_id']][] = $application;
            }
        }

        foreach ($renewalGroups as $sourceApplicationId => $groupApplications) {
            usort($groupApplications, function ($left, $right): int {
                $leftTime = strtotime((string) $left->created_at);
                $rightTime = strtotime((string) $right->created_at);
                return $leftTime <=> $rightTime;
            });
            $renewalCount = count($groupApplications);
            $lastRenewedApplication = $groupApplications[$renewalCount - 1] ?? null;
            $lastRenewedAt = $this->toIsoString($lastRenewedApplication?->created_at);

            if (isset($context[$sourceApplicationId])) {
                $context[$sourceApplicationId]['renewal_count'] = $renewalCount;
                $context[$sourceApplicationId]['last_renewed_at'] = $lastRenewedAt;
            }

            foreach ($groupApplications as $application) {
                $context[$application->id]['renewal_count'] = $renewalCount;
                $context[$application->id]['last_renewed_at'] = $lastRenewedAt;
            }
        }

        return $context;
    }

    private function toIsoString(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format(DateTimeInterface::ATOM);
        }

        if (is_string($value) && trim($value) !== '') {
            return $value;
        }

        return null;
    }
}
