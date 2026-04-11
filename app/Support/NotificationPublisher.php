<?php

namespace App\Support;

use App\Models\Notification;
use App\Models\User;

class NotificationPublisher
{
    public static function createForUser(int $userId, string $title, string $message): Notification
    {
        return Notification::query()->create([
            'user_id' => $userId,
            'title' => trim($title),
            'message' => trim($message),
            'is_read' => false,
            'created_at' => now(),
        ]);
    }

    public static function createForUsers(iterable $users, string $title, string $message): void
    {
        $rows = [];
        $now = now();

        foreach ($users as $user) {
            $userId = $user instanceof User ? $user->id : (int) $user;
            if ($userId <= 0) {
                continue;
            }

            $rows[] = [
                'user_id' => $userId,
                'title' => trim($title),
                'message' => trim($message),
                'is_read' => false,
                'created_at' => $now,
            ];
        }

        if ($rows !== []) {
            Notification::query()->insert($rows);
        }
    }

    public static function createForRole(string $role, string $title, string $message): void
    {
        $userIds = User::query()
            ->where('role', $role)
            ->pluck('id');

        self::createForUsers($userIds, $title, $message);
    }
}
