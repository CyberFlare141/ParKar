<?php

namespace App\Http\Controllers;

use App\Http\Services\Ai\AiDocumentService;
use App\Models\AiAnalysis;
use App\Models\ApplicationDocument;
use App\Models\Document;
use App\Models\ParkingApplication;
use App\Models\Semester;
use App\Models\Vehicle;
use DateTimeInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class StudentParkingApplicationController extends Controller
{
    private const DOCUMENT_FIELD_TO_TYPE = [
        'vehicle_registration_certificate' => 'registration',
        'driving_license'                  => 'license',
        'university_id_card'               => 'id_card',
        'vehicle_photo'                    => 'vehicle_photo',
    ];

    /**
     * Document types that MUST pass the "is_car_document" check.
     * university_id_card and vehicle_photo are treated differently.
     */
    private const CAR_DOC_TYPES = ['registration', 'license'];

    public function __construct(private AiDocumentService $aiService)
    {
        // AiDocumentService is injected by Laravel's container
    }

    // ── store ────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'aust_id'          => ['required', 'string', 'max:50'],
            'semester_id'      => ['required', 'integer', 'exists:semesters,id'],
            'email'            => ['required', 'email:rfc', 'max:255'],
            'contact_phone'    => ['required', 'string', 'max:20'],
            'vehicle_plate'    => ['required', 'string', 'max:20'],
            'vehicle_type'     => ['required', 'in:car,motorcycle,other'],
            'vehicle_model'    => ['required', 'string', 'max:120'],
            'vehicle_color'    => ['required', 'string', 'max:50'],
            'vehicle_brand'    => ['required', 'string', 'max:120'],
            'registration_number' => ['required', 'string', 'max:100'],
            'notes'            => ['nullable', 'string', 'max:2000'],
            'nda_signed'       => ['required', 'boolean'],
            'documents'        => ['required', 'array'],
            'documents.vehicle_registration_certificate' => [
                'required', 'file',
                'mimetypes:application/pdf,image/jpeg,image/png', 'max:5120',
            ],
            'documents.driving_license' => [
                'required', 'file',
                'mimetypes:application/pdf,image/jpeg,image/png', 'max:5120',
            ],
            'documents.university_id_card' => [
                'required', 'file',
                'mimetypes:application/pdf,image/jpeg,image/png', 'max:5120',
            ],
            'documents.vehicle_photo' => [
                'required', 'file',
                'mimetypes:image/jpeg,image/png', 'max:5120',
            ],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // ── Step 1: Run AI checks on all documents BEFORE touching the DB ────
        $aiResults = [];
        $rejections = [];

        foreach (self::DOCUMENT_FIELD_TO_TYPE as $field => $docType) {
            $file      = $request->file("documents.$field");
            $aiResult  = $this->aiService->analyse($file);
            $aiResults[$docType] = $aiResult;

            // Quality gate
            if ($aiResult['clarity'] === 'unclear' && empty($aiResult['error'])) {
                $rejections[] = [
                    'field'  => $field,
                    'reason' => 'Image quality issues: ' . implode(', ', $aiResult['issues']),
                ];
            }

            // Document-type gate (only for car docs, not id_card / vehicle_photo)
            if (
                in_array($docType, self::CAR_DOC_TYPES, true)
                && ! $aiResult['is_car_document']
                && empty($aiResult['error'])
            ) {
                $rejections[] = [
                    'field'  => $field,
                    'reason' => 'The uploaded image does not appear to be a valid car document.',
                ];
            }
        }

        if (! empty($rejections)) {
            return response()->json([
                'message'    => 'One or more documents failed AI verification. Please re-upload clearer images.',
                'rejections' => $rejections,
            ], 422);
        }

        // ── Step 2: Persist everything ───────────────────────────────────────
        $storedPaths = [];

        try {
            DB::beginTransaction();

            $user->forceFill([
                'name'          => trim((string) $payload['name']),
                'email'         => strtolower(trim((string) $payload['email'])),
                'phone'         => trim((string) $payload['contact_phone']),
                'university_id' => trim((string) $payload['aust_id']),
            ])->save();

            $vehicle = Vehicle::query()->create([
                'user_id'             => $user->id,
                'plate_number'        => strtoupper(trim((string) $payload['vehicle_plate'])),
                'vehicle_type'        => $payload['vehicle_type'],
                'brand'               => trim((string) $payload['vehicle_brand']),
                'model'               => trim((string) $payload['vehicle_model']),
                'color'               => trim((string) $payload['vehicle_color']),
                'registration_number' => trim((string) $payload['registration_number']),
            ]);

            $application = ParkingApplication::query()->create([
                'user_id'                    => $user->id,
                'semester_id'                => $payload['semester_id'],
                'vehicle_id'                 => $vehicle->id,
                'status'                     => 'pending',
                'register_as'                => (string) $user->role,
                'applicant_name'             => trim((string) $payload['name']),
                'applicant_university_id'    => trim((string) $payload['aust_id']),
                'applicant_email'            => strtolower(trim((string) $payload['email'])),
                'applicant_phone'            => trim((string) $payload['contact_phone']),
                'notes'                      => isset($payload['notes']) ? trim((string) $payload['notes']) : null,
                'nda_signed'                 => (bool) $payload['nda_signed'],
            ]);

            foreach (self::DOCUMENT_FIELD_TO_TYPE as $field => $docType) {
                $file = $request->file("documents.$field");
                $path = $file->store("parking-documents/{$user->id}", 'public');
                $storedPaths[] = $path;

                $document = Document::query()->create([
                    'user_id'       => $user->id,
                    'document_type' => $docType,
                    'file_path'     => $path,
                    'is_verified'   => false,
                ]);

                ApplicationDocument::query()->create([
                    'application_id' => $application->id,
                    'document_id'    => $document->id,
                    'created_at'     => now(),
                ]);
            }

            // ── Step 3: Persist AI analysis results ──────────────────────────
            $avgBlur = null; // optional: pull from _debug if you expose it
            $avgRisk = collect($aiResults)
                ->avg(fn ($r) => 1 - $r['confidence']);

            AiAnalysis::query()->create([
                'application_id'          => $application->id,
                'blurry_score'            => $avgBlur,
                'risk_score'              => round((float) $avgRisk, 4),
                'renewal_recommendation'  => false,
                'raw_response'            => $aiResults,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Parking application submitted successfully.',
                'data'    => [
                    'application_id'  => $application->id,
                    'status'          => $application->status,
                    'ai_verification' => [
                        'passed'      => true,
                        'summary'     => collect($aiResults)->map(fn ($r) => [
                            'is_car_document' => $r['is_car_document'],
                            'clarity'         => $r['clarity'],
                            'confidence'      => $r['confidence'],
                        ]),
                    ],
                ],
            ], 201);

        } catch (Throwable $exception) {
            DB::rollBack();

            foreach ($storedPaths as $stored) {
                Storage::disk('public')->delete($stored);
            }

            report($exception);

            return response()->json([
                'message' => 'Failed to submit parking application. Please try again.',
            ], 500);
        }
    }

    // ── Other methods unchanged from original ────────────────────────────────

    public function semesters(): JsonResponse
    {
        $semesters = Semester::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'start_date', 'end_date']);

        return response()->json(['data' => $semesters]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        // ... (unchanged from original – omitted here for brevity) ...
        return response()->json(['message' => 'dashboard']);
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
