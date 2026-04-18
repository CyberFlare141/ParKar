<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $limit = min(max((int) $request->integer('limit', 5), 1), 20);

        $notifications = Notification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (Notification $notification): array => [
                'id' => $notification->id,
                'title' => $notification->title,
                'message' => $notification->message,
                'is_read' => (bool) $notification->is_read,
                'created_at' => $notification->created_at?->toAtomString(),
            ])
            ->values();

        return response()->json([
            'data' => $notifications,
            'meta' => [
                'unread_count' => Notification::query()
                    ->where('user_id', $user->id)
                    ->where('is_read', false)
                    ->count(),
            ],
        ]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ((int) $notification->user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Notification not found.',
            ], 404);
        }

        if (!$notification->is_read) {
            $notification->forceFill([
                'is_read' => true,
            ])->save();
        }

        return response()->json([
            'message' => 'Notification marked as read.',
        ]);
    }
}
