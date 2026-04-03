<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\ParkingApplication;
use App\Models\Semester;
use App\Models\User;
use App\Support\AdminPresence;
use DateTimeInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $presenceWindowMinutes = max((int) config('jwt.ttl_minutes', 60), 1);
        $onlineAdmins = AdminPresence::snapshot($presenceWindowMinutes);

        $applications = ParkingApplication::query()
            ->with([
                'semester:id,name,start_date,end_date',
                'vehicle:id,plate_number,brand,model,vehicle_type,color',
                'parkingTicket:id,application_id,ticket_id,issue_date,parking_slot',
            ])
            ->orderByDesc('created_at')
            ->get();

        $approvedCount = $applications->where('status', 'approved')->count();
        $rejectedCount = $applications->where('status', 'rejected')->count();
        $pendingCount = $applications->where('status', 'pending')->count();
        $reviewedCount = $approvedCount + $rejectedCount;

        $activeSemester = Semester::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->first(['id', 'name', 'start_date', 'end_date', 'vehicle_quota', 'semester_fee']);

        $recentAuditLogs = AuditLog::query()
            ->with('application:id,applicant_name,status')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get();

        return response()->json([
            'data' => [
                'admin' => $request->user()?->only(['id', 'name', 'email', 'role']),
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
                    'pending_applications' => $pendingCount,
                    'approved_applications' => $approvedCount,
                    'rejected_applications' => $rejectedCount,
                    'approval_rate' => $reviewedCount > 0
                        ? round(($approvedCount / $reviewedCount) * 100, 1)
                        : 0.0,
                    'tickets_issued' => $approvedCount,
                    'total_users' => User::query()->count(),
                    'student_users' => User::query()->where('role', 'student')->count(),
                    'teacher_users' => User::query()->where('role', 'teacher')->count(),
                    'admin_users' => User::query()->where('role', 'admin')->count(),
                    'active_users' => User::query()->where('is_active', true)->count(),
                    'total_documents' => Document::query()->count(),
                    'verified_documents' => Document::query()->where('is_verified', true)->count(),
                    'logged_in_admins' => $onlineAdmins->count(),
                ],
                'recent_applications' => $applications
                    ->take(6)
                    ->map(fn (ParkingApplication $application): array => $this->mapApplication($application))
                    ->values(),
                'priority_queue' => $applications
                    ->where('status', 'pending')
                    ->take(5)
                    ->map(fn (ParkingApplication $application): array => $this->mapApplication($application))
                    ->values(),
                'recent_audit_logs' => $recentAuditLogs
                    ->map(fn (AuditLog $log): array => [
                        'id' => $log->id,
                        'action' => $log->action,
                        'reason' => $log->reason,
                        'created_at' => $this->toIsoString($log->created_at),
                        'application' => $log->application ? [
                            'id' => $log->application->id,
                            'applicant_name' => $log->application->applicant_name,
                            'status' => $log->application->status,
                        ] : null,
                    ])
                    ->values(),
                'admin_presence' => [
                    'logged_in_count' => $onlineAdmins->count(),
                    'window_minutes' => $presenceWindowMinutes,
                    'admins' => $onlineAdmins->values(),
                ],
            ],
        ]);
    }

    private function mapApplication(ParkingApplication $application): array
    {
        return [
            'id' => $application->id,
            'status' => $application->status,
            'created_at' => $this->toIsoString($application->created_at),
            'reviewed_at' => $this->toIsoString($application->reviewed_at),
            'applicant_name' => $application->applicant_name,
            'applicant_email' => $application->applicant_email,
            'applicant_phone' => $application->applicant_phone,
            'register_as' => $application->register_as,
            'admin_comment' => $application->admin_comment,
            'semester' => $application->semester ? [
                'id' => $application->semester->id,
                'name' => $application->semester->name,
                'start_date' => $application->semester->start_date,
                'end_date' => $application->semester->end_date,
            ] : null,
            'vehicle' => $application->vehicle ? [
                'plate_number' => $application->vehicle->plate_number,
                'brand' => $application->vehicle->brand,
                'model' => $application->vehicle->model,
                'vehicle_type' => $application->vehicle->vehicle_type,
                'color' => $application->vehicle->color,
            ] : null,
            'ticket' => $application->parkingTicket ? [
                'ticket_id' => $application->parkingTicket->ticket_id,
                'issue_date' => $this->toIsoString($application->parkingTicket->issue_date),
                'parking_slot' => $application->parkingTicket->parking_slot,
            ] : null,
        ];
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
