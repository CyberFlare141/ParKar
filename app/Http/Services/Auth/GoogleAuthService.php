<?php

namespace App\Http\Services\Auth;

use App\Exceptions\GoogleAuthException;
use App\Models\User;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class GoogleAuthService
{
    public function __construct(
        private readonly RoleDetectionService $roleDetectionService
    ) {
    }

    public function findOrCreate(SocialiteUser $googleUser): User
    {
        $googleId = trim((string) $googleUser->getId());
        $email = $this->normalizeEmail($googleUser->getEmail());

        if ($googleId === '') {
            throw GoogleAuthException::googleAccountLinkedElsewhere();
        }

        if ($email === '') {
            throw GoogleAuthException::missingEmail();
        }

        $existingGoogleUser = User::query()
            ->where('google_id', $googleId)
            ->first();

        if ($existingGoogleUser) {
            $this->guardActiveUser($existingGoogleUser);

            return $this->syncGoogleProfile($existingGoogleUser, $googleUser);
        }

        $existingEmailUser = User::query()
            ->where('email', $email)
            ->first();

        if ($existingEmailUser) {
            $this->guardActiveUser($existingEmailUser);

            if ($existingEmailUser->google_id !== null && $existingEmailUser->google_id !== $googleId) {
                throw GoogleAuthException::googleAccountLinkedElsewhere();
            }

            return $this->syncGoogleProfile($existingEmailUser, $googleUser);
        }

        $role = $this->roleDetectionService->detectUserRole($email);
        if ($role === null) {
            throw GoogleAuthException::missingEmail();
        }

        return User::query()->create([
            'name' => $this->resolveDisplayName($googleUser),
            'email' => $email,
            'password' => null,
            'role' => $role,
            'is_active' => true,
            'email_verified_at' => now(),
            'google_id' => $googleId,
            'google_avatar' => $this->nullableString($googleUser->getAvatar()),
            'auth_provider' => 'google',
        ]);
    }

    public function linkAuthenticatedUser(User $user, SocialiteUser $googleUser): User
    {
        $this->guardActiveUser($user);

        $googleId = trim((string) $googleUser->getId());
        $email = $this->normalizeEmail($googleUser->getEmail());

        if ($googleId === '') {
            throw GoogleAuthException::googleAccountLinkedElsewhere();
        }

        if ($email === '') {
            throw GoogleAuthException::missingEmail();
        }

        if (strtolower((string) $user->email) !== $email) {
            throw GoogleAuthException::mismatchedEmail();
        }

        $linkedUser = User::query()
            ->where('google_id', $googleId)
            ->first();

        if ($linkedUser && $linkedUser->id !== $user->id) {
            throw GoogleAuthException::googleAccountLinkedElsewhere();
        }

        return $this->syncGoogleProfile($user, $googleUser);
    }

    private function syncGoogleProfile(User $user, SocialiteUser $googleUser): User
    {
        $this->guardActiveUser($user);

        $email = $this->normalizeEmail($googleUser->getEmail());
        $googleId = trim((string) $googleUser->getId());
        $role = $this->roleDetectionService->detectUserRole($email);

        $user->forceFill([
            'name' => $user->name ?: $this->resolveDisplayName($googleUser),
            'google_id' => $googleId,
            'google_avatar' => $this->nullableString($googleUser->getAvatar()),
            'email_verified_at' => $user->email_verified_at ?: now(),
            'auth_provider' => $user->password ? 'both' : 'google',
            'role' => $role ?: $user->role,
        ])->save();

        return $user->fresh();
    }

    private function resolveDisplayName(SocialiteUser $googleUser): string
    {
        $name = trim((string) ($googleUser->getName() ?: $googleUser->getNickname() ?: ''));
        if ($name !== '') {
            return $name;
        }

        $email = $this->normalizeEmail($googleUser->getEmail());
        $localPart = strstr($email, '@', true);

        return $localPart !== false && $localPart !== ''
            ? $localPart
            : 'Google User';
    }

    private function guardActiveUser(User $user): void
    {
        if (!$user->is_active) {
            throw GoogleAuthException::disabledAccount();
        }
    }

    private function normalizeEmail(?string $email): string
    {
        return strtolower(trim((string) $email));
    }

    private function nullableString(?string $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized !== '' ? $normalized : null;
    }
}
