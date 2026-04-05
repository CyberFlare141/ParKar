<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\ParkingApplication;
use App\Models\ParkingTicket;
use DateTimeInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class AdminParkingApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 1), 100);
        $status = trim((string) $request->query('status', ''));
        $search = trim((string) $request->query('search', ''));

        $query = ParkingApplication::query()
            ->with([
                'user:id,name,email,university_id,role',
                'semester:id,name,start_date,end_date',
                'vehicle:id,plate_number,vehicle_type,brand,model,color,registration_number',
                'documents:id,document_type,file_path,is_verified,created_at',
                'parkingTicket:id,ticket_id,application_id,issue_date,parking_slot',
            ])
            ->orderByDesc('id');

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('applicant_name', 'like', "%{$search}%")
                    ->orWhere('applicant_university_id', 'like', "%{$search}%")
                    ->orWhere('applicant_email', 'like', "%{$search}%")
                    ->orWhereHas('vehicle', function ($vehicleQuery) use ($search): void {
                        $vehicleQuery
                            ->where('plate_number', 'like', "%{$search}%")
                            ->orWhere('registration_number', 'like', "%{$search}%");
                    });
            });
        }

        $paginated = $query->paginate($perPage);
        $items = $paginated
            ->getCollection()
            ->map(fn (ParkingApplication $application): array => $this->toApplicationSummary($application));

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function review(Request $request, ParkingApplication $parkingApplication): JsonResponse
    {
        $payload = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'admin_comment' => ['nullable', 'string', 'max:2000'],
            'parking_slot' => ['nullable', 'string', 'max:40'],
        ]);

        if ($payload['status'] === 'rejected' && empty(trim((string) ($payload['admin_comment'] ?? '')))) {
            throw ValidationException::withMessages([
                'admin_comment' => ['A comment is required when rejecting an application.'],
            ]);
        }

        try {
            $updated = DB::transaction(function () use ($request, $parkingApplication, $payload): ParkingApplication {
                $application = ParkingApplication::query()
                    ->whereKey($parkingApplication->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($application->status !== 'pending') {
                    throw ValidationException::withMessages([
                        'status' => ['Only pending applications can be reviewed.'],
                    ]);
                }

                $application->forceFill([
                    'status' => $payload['status'],
                    'admin_comment' => isset($payload['admin_comment']) ? trim((string) $payload['admin_comment']) : null,
                    'reviewed_by' => $request->user()?->id,
                    'reviewed_at' => now(),
                ])->save();

                $ticket = null;
                if ($payload['status'] === 'approved') {
                    $ticket = ParkingTicket::query()->firstOrCreate(
                        ['application_id' => $application->id],
                        [
                            'ticket_id' => $this->generateUniqueTicketId(),
                            'issue_date' => now(),
                            'parking_slot' => isset($payload['parking_slot']) ? trim((string) $payload['parking_slot']) : null,
                        ]
                    );
                }

                AuditLog::query()->create([
                    'admin_id' => $request->user()?->id,
                    'application_id' => $application->id,
                    'action' => $payload['status'] === 'approved' ? 'approved' : 'rejected',
                    'reason' => isset($payload['admin_comment']) ? trim((string) $payload['admin_comment']) : null,
                    'created_at' => now(),
                ]);

                $application->load([
                    'user:id,name,email,university_id,role',
                    'semester:id,name,start_date,end_date',
                    'vehicle:id,plate_number,vehicle_type,brand,model,color,registration_number',
                    'documents:id,document_type,file_path,is_verified,created_at',
                    'parkingTicket:id,ticket_id,application_id,issue_date,parking_slot',
                ]);

                if ($ticket !== null && $application->parkingTicket === null) {
                    $application->setRelation('parkingTicket', $ticket);
                }

                return $application;
            });
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Failed to update application review status.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json([
            'message' => $updated->status === 'approved'
                ? 'Application approved and ticket issued.'
                : 'Application rejected.',
            'data' => $this->toApplicationSummary($updated),
        ]);
    }

    public function documents(ParkingApplication $parkingApplication): JsonResponse
    {
        $parkingApplication->loadMissing([
            'documents:id,document_type,file_path,is_verified,created_at',
        ]);

        return response()->json([
            'data' => [
                'application_id' => $parkingApplication->id,
                'documents' => $parkingApplication->documents->map(
                    fn (Document $document): array => $this->toDocumentSummary($document)
                )->values(),
            ],
        ]);
    }

    public function viewDocument(Document $document): StreamedResponse|JsonResponse
    {
        return $this->streamDocument($document, false);
    }

    public function downloadDocument(Document $document): StreamedResponse|JsonResponse
    {
        return $this->streamDocument($document, true);
    }

    private function streamDocument(Document $document, bool $asAttachment): StreamedResponse|JsonResponse
    {
        $disk = Storage::disk('public');
        $path = (string) $document->file_path;

        if (!$disk->exists($path)) {
            return response()->json([
                'message' => 'Document file was not found on server storage.',
            ], Response::HTTP_NOT_FOUND);
        }

        $stream = $disk->readStream($path);
        if ($stream === false) {
            return response()->json([
                'message' => 'Unable to open document file.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $mimeType = $disk->mimeType($path) ?: 'application/octet-stream';
        $filename = basename($path);
        $disposition = $asAttachment ? 'attachment' : 'inline';

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, Response::HTTP_OK, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => $disposition . '; filename="' . $filename . '"',
        ]);
    }

    private function toApplicationSummary(ParkingApplication $application): array
    {
        return [
            'id' => $application->id,
            'status' => $application->status,
            'created_at' => $this->toIsoString($application->created_at),
            'reviewed_at' => $this->toIsoString($application->reviewed_at),
            'admin_comment' => $application->admin_comment,
            'applicant' => [
                'name' => $application->applicant_name,
                'university_id' => $application->applicant_university_id,
                'email' => $application->applicant_email,
                'phone' => $application->applicant_phone,
                'role' => $application->register_as ?: $application->user?->role ?: 'unknown',
            ],
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
            'documents' => $application->documents->map(
                fn (Document $document): array => $this->toDocumentSummary($document)
            )->values(),
            'ticket' => $application->parkingTicket ? [
                'ticket_id' => $application->parkingTicket->ticket_id,
                'issue_date' => $this->toIsoString($application->parkingTicket->issue_date),
                'parking_slot' => $application->parkingTicket->parking_slot,
            ] : null,
        ];
    }

    private function toDocumentSummary(Document $document): array
    {
        return [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'file_path' => $document->file_path,
            'is_verified' => (bool) $document->is_verified,
            'created_at' => $this->toIsoString($document->created_at),
            'view_url' => url("/api/admin/documents/{$document->id}/view"),
            'download_url' => url("/api/admin/documents/{$document->id}/download"),
        ];
    }

    private function generateUniqueTicketId(): string
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $candidate = 'PKT-' . now()->format('Ymd') . '-' . str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            if (!ParkingTicket::query()->where('ticket_id', $candidate)->exists()) {
                return $candidate;
            }
        }

        return 'PKT-' . now()->format('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(2)));
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
