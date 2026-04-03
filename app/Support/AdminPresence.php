<?php

namespace App\Support;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class AdminPresence
{
    private const CACHE_KEY = 'admin_dashboard_presence';

    public static function markOnline(User $user, int $ttlMinutes): void
    {
        if ($user->role !== 'admin') {
            return;
        }

        $entries = self::entries();
        $now = now();

        $entries[(string) $user->id] = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'last_seen_at' => $now->toIso8601String(),
            'expires_at' => $now->copy()->addMinutes(max($ttlMinutes, 1))->toIso8601String(),
        ];

        User::query()
            ->whereKey($user->id)
            ->update(['updated_at' => $now]);

        self::persist($entries, $ttlMinutes);
    }

    public static function markOffline(User $user, int $ttlMinutes): void
    {
        if ($user->role !== 'admin') {
            return;
        }

        $entries = self::entries();
        unset($entries[(string) $user->id]);

        User::query()
            ->whereKey($user->id)
            ->update(['updated_at' => now()->subMinutes(max($ttlMinutes, 1) + 1)]);

        self::persist($entries, $ttlMinutes);
    }

    public static function snapshot(int $ttlMinutes): Collection
    {
        $now = now();
        $windowStart = $now->copy()->subMinutes(max($ttlMinutes, 1));

        $cachedEntries = collect(self::entries())
            ->filter(function (array $entry) use ($now): bool {
                $expiresAt = Carbon::parse((string) ($entry['expires_at'] ?? $now->toIso8601String()));

                return $expiresAt->greaterThan($now);
            })
            ->mapWithKeys(fn (array $entry): array => [
                (string) $entry['id'] => [
                    'id' => $entry['id'],
                    'name' => $entry['name'],
                    'email' => $entry['email'],
                    'last_seen_at' => $entry['last_seen_at'],
                ],
            ]);

        $databaseEntries = User::query()
            ->where('role', 'admin')
            ->where('is_active', true)
            ->where('updated_at', '>=', $windowStart)
            ->get(['id', 'name', 'email', 'updated_at'])
            ->mapWithKeys(fn (User $user): array => [
                (string) $user->id => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'last_seen_at' => self::toIsoString($user->updated_at),
                ],
            ]);

        $activeEntries = $databaseEntries
            ->merge($cachedEntries)
            ->sortByDesc('last_seen_at')
            ->values();

        self::persist(
            $activeEntries
                ->map(fn (array $entry): array => [
                    'id' => $entry['id'],
                    'name' => $entry['name'],
                    'email' => $entry['email'],
                    'last_seen_at' => $entry['last_seen_at'],
                    'expires_at' => $now->copy()->addMinutes(max($ttlMinutes, 1))->toIso8601String(),
                ])
                ->keyBy(fn (array $entry): string => (string) $entry['id'])
                ->all(),
            $ttlMinutes
        );

        return $activeEntries;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private static function entries(): array
    {
        $entries = Cache::get(self::CACHE_KEY, []);

        return is_array($entries) ? $entries : [];
    }

    /**
     * @param array<string, array<string, mixed>> $entries
     */
    private static function persist(array $entries, int $ttlMinutes): void
    {
        Cache::put(
            self::CACHE_KEY,
            $entries,
            now()->addMinutes(max($ttlMinutes, 1))
        );
    }

    private static function toIsoString(mixed $value): ?string
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
