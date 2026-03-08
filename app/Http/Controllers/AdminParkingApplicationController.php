<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\ParkingApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminParkingApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 1), 100);
        $status = trim((string) $request->query('status', ''));
        $search = trim((string) $request->query('search', ''));

        $query = ParkingApplication::query()
            ->with([
                'user:id,name,email,university_id',
                'semester:id,name,start_date,end_date',
                'vehicle:id,plate_number,vehicle_type,brand,model,color,registration_number',
                'documents:id,document_type,file_path,is_verified,created_at',
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
            'created_at' => $application->created_at?->toIso8601String(),
            'applicant' => [
                'name' => $application->applicant_name,
                'university_id' => $application->applicant_university_id,
                'email' => $application->applicant_email,
                'phone' => $application->applicant_phone,
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
        ];
    }

    private function toDocumentSummary(Document $document): array
    {
        return [
            'id' => $document->id,
            'document_type' => $document->document_type,
            'file_path' => $document->file_path,
            'is_verified' => (bool) $document->is_verified,
            'created_at' => $document->created_at?->toIso8601String(),
            'view_url' => url("/api/admin/documents/{$document->id}/view"),
            'download_url' => url("/api/admin/documents/{$document->id}/download"),
        ];
    }
}
