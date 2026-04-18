<?php

namespace App\Http\Controllers;

use App\Exceptions\GoogleAuthException;
use App\Http\Services\Auth\GoogleAuthService;
use App\Http\Services\Auth\JwtService;
use App\Http\Services\Auth\OtpService;
use App\Http\Services\Auth\RoleDetectionService;
use App\Models\AuthOtp;
use App\Models\User;
use App\Support\AdminPresence;
use App\Support\NotificationPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class AuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
        private readonly JwtService $jwtService,
        private readonly RoleDetectionService $roleDetectionService,
        private readonly GoogleAuthService $googleAuthService
    ) {
    }

    public function register(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['nullable', 'string', 'max:255', 'required_without:fullName'],
            'fullName' => ['nullable', 'string', 'max:255', 'required_without:name'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'phone' => ['nullable', 'string', 'max:20'],
            'university_id' => ['nullable', 'string', 'max:50'],
            'studentId' => ['nullable', 'string', 'max:50'],
            'department' => ['nullable', 'string', 'max:100'],
            'otp_channel' => ['nullable', 'in:email,phone'],
        ]);

        $email = strtolower(trim((string) $payload['email']));
        $name = $payload['name'] ?? $payload['fullName'] ?? '';
        $universityId = $payload['university_id'] ?? $payload['studentId'] ?? null;
        $isAllowListedEmail = $this->roleDetectionService->isAllowListedEmail($email);
        if (!str_ends_with($email, '@aust.edu') && !$isAllowListedEmail) {
            throw ValidationException::withMessages([
                'email' => ['Only @aust.edu emails are allowed unless the address is listed in ADMIN_EMAILS/TEACHER_EMAILS.'],
            ]);
        }

        $detectedRole = $this->detectUserRoleOrFail($email);

        if (($payload['otp_channel'] ?? 'email') === 'phone' && empty($payload['phone'])) {
            throw ValidationException::withMessages([
                'phone' => ['A phone number is required when OTP channel is phone.'],
            ]);
        }

        $user = User::create([
            'name' => trim((string) $name),
            'email' => $email,
            'password' => Hash::make((string) $payload['password']),
            'phone' => $payload['phone'] ?? null,
            'university_id' => $universityId,
            'department' => $payload['department'] ?? null,
            'role' => $detectedRole,
            'is_active' => true,
            'email_verified_at' => null,
        ]);

        $challenge = $this->otpService->createChallenge(
            $user,
            'register',
            $payload['otp_channel'] ?? 'email'
        );

        NotificationPublisher::createForUser(
            $user->id,
            'Welcome to ParKar',
            'Your account has been created. Verify the OTP to activate access to the parking portal.'
        );

        return response()->json([
            'message' => 'Registration successful. Please verify the OTP to activate your account.',
            'requires_otp' => true,
            'challenge_id' => $challenge['challenge_id'],
            'purpose' => 'register',
            'channel' => $challenge['channel'],
            'expires_at' => $challenge['expires_at'],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $email = strtolower(trim((string) $payload['email']));
        $user = User::where('email', $email)->first();

        if ($user && $user->password === null && in_array((string) $user->auth_provider, ['google', 'both'], true)) {
            return response()->json([
                'message' => 'This account uses Google sign-in. Continue with Google to access it.',
            ], 422);
        }

        if (!$user || !Hash::check((string) $payload['password'], (string) $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account is deactivated.',
            ], 403);
        }

        $detectedRole = $this->syncUserRoleFromEmail($user);
        AdminPresence::markOnline($user, (int) config('jwt.ttl_minutes', 60));

        return response()->json([
            'message' => 'Login successful.',
            'token' => $this->jwtService->issueToken($user),
            'token_type' => 'Bearer',
            'user' => $this->serializeUser($user),
            'detected_role' => $detectedRole,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'challenge_id' => ['required', 'string', 'size:64'],
            'otp' => ['required', 'digits:6'],
            'purpose' => ['required', 'in:register,login'],
        ]);

        $throttleKey = sprintf(
            'otp-verify:%s:%s',
            (string) $request->ip(),
            (string) $payload['challenge_id']
        );

        if (RateLimiter::tooManyAttempts($throttleKey, 10)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many verification attempts. Try again in {$seconds} seconds.",
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);
        $verification = $this->otpService->verifyChallenge(
            (string) $payload['challenge_id'],
            (string) $payload['otp'],
            (string) $payload['purpose']
        );

        if (!$verification['ok']) {
            return response()->json([
                'message' => $verification['message'],
                'remaining_attempts' => $verification['remaining_attempts'] ?? null,
            ], $verification['status']);
        }

        /** @var User $user */
        $user = $verification['user'];

        if ($payload['purpose'] === 'register' && !$user->email_verified_at) {
            $user->email_verified_at = now();
        }

        $user->save();
        AdminPresence::markOnline($user, (int) config('jwt.ttl_minutes', 60));

        AuthOtp::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'login')
            ->whereNull('consumed_at')
            ->whereNull('invalidated_at')
            ->update(['invalidated_at' => now()]);

        $this->syncUserRoleFromEmail($user);
        $token = $this->jwtService->issueToken($user);

        NotificationPublisher::createForUser(
            $user->id,
            'Login successful',
            'You are signed in and can now access your parking dashboard.'
        );

        RateLimiter::clear($throttleKey);

        return response()->json([
            'message' => 'OTP verified successfully.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->serializeUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'user' => $this->serializeUser($user),
        ]);
    }

    public function updateMe(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $user->forceFill([
            'name' => trim((string) $payload['name']),
            'phone' => isset($payload['phone']) && trim((string) $payload['phone']) !== ''
                ? trim((string) $payload['phone'])
                : null,
        ])->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->serializeUser($user->fresh()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        AuthOtp::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'login')
            ->whereNull('consumed_at')
            ->whereNull('invalidated_at')
            ->update(['invalidated_at' => now()]);

        AdminPresence::markOffline($user, (int) config('jwt.ttl_minutes', 60));

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'challenge_id' => ['required', 'string', 'size:64'],
        ]);

        /** @var \App\Models\AuthOtp|null $existing */
        $existing = AuthOtp::query()
            ->with('user')
            ->where('challenge_id', $payload['challenge_id'])
            ->first();

        if (!$existing || !$existing->user) {
            return response()->json([
                'message' => 'Invalid OTP challenge.',
            ], 404);
        }

        if ($existing->consumed_at) {
            return response()->json([
                'message' => 'OTP challenge already completed.',
            ], 422);
        }

        $throttleKey = sprintf('otp-resend:%s:%d', (string) $request->ip(), (int) $existing->user_id);
        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many resend requests. Try again in {$seconds} seconds.",
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);

        $challenge = $this->otpService->createChallenge(
            $existing->user,
            $existing->purpose,
            $existing->channel
        );

        return response()->json([
            'message' => 'A new OTP has been sent.',
            'requires_otp' => true,
            'challenge_id' => $challenge['challenge_id'],
            'purpose' => $existing->purpose,
            'channel' => $challenge['channel'],
            'expires_at' => $challenge['expires_at'],
        ]);
    }

    public function googleRedirect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->scopes(['openid', 'email', 'profile'])
            ->redirect();
    }

    public function googleCallback(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->query('error') === 'access_denied') {
            return $this->redirectToFrontendLogin([
                'error' => 'access_denied',
                'message' => 'Google sign-in was cancelled.',
            ]);
        }

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (InvalidStateException) {
            return $this->redirectToFrontendLogin([
                'error' => 'google_auth_failed',
                'message' => 'Invalid OAuth state. Please try again.',
            ]);
        } catch (\Throwable $exception) {
            Log::error('Google OAuth callback failed.', [
                'message' => $exception->getMessage(),
                'path' => $request->path(),
            ]);

            return $this->redirectToFrontendLogin([
                'error' => 'google_auth_failed',
                'message' => 'Google authentication failed.',
            ]);
        }

        $email = strtolower(trim((string) $googleUser->getEmail()));
        if ($email === '') {
            return $this->redirectToFrontendLogin([
                'error' => 'google_auth_failed',
                'message' => 'Google account did not return a usable email address.',
            ]);
        }

        if (!str_ends_with($email, '@aust.edu') && !$this->roleDetectionService->isAllowListedEmail($email)) {
            return $this->redirectToFrontendLogin([
                'error' => 'google_auth_failed',
                'message' => 'Only @aust.edu accounts allowed.',
            ]);
        }

        try {
            $user = $this->googleAuthService->findOrCreate($googleUser);
        } catch (GoogleAuthException $exception) {
            return $this->redirectToFrontendLogin([
                'error' => 'google_auth_failed',
                'message' => $exception->getMessage(),
            ]);
        }

        $this->syncUserRoleFromEmail($user);
        AdminPresence::markOnline($user, (int) config('jwt.ttl_minutes', 60));

        AuthOtp::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'login')
            ->whereNull('consumed_at')
            ->whereNull('invalidated_at')
            ->update(['invalidated_at' => now()]);

        $token = $this->jwtService->issueToken($user);

        return $this->redirectToFrontendLogin([
            'token' => $token,
            'user' => json_encode($this->serializeUser($user), JSON_UNESCAPED_SLASHES),
        ]);
    }

    public function googleLink(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'access_token' => ['required', 'string'],
        ]);

        try {
            $googleUser = Socialite::driver('google')->userFromToken((string) $payload['access_token']);
        } catch (\Throwable $exception) {
            Log::error('Google account linking failed.', [
                'message' => $exception->getMessage(),
                'path' => $request->path(),
            ]);

            return response()->json([
                'message' => 'Google authentication failed.',
            ], 500);
        }

        $email = strtolower(trim((string) $googleUser->getEmail()));
        if ($email === '') {
            return response()->json([
                'message' => 'Google account did not return a usable email address.',
            ], 422);
        }

        if (!str_ends_with($email, '@aust.edu') && !$this->roleDetectionService->isAllowListedEmail($email)) {
            return response()->json([
                'message' => 'Only @aust.edu accounts allowed.',
            ], 403);
        }

        /** @var User $user */
        $user = $request->user();

        try {
            $linkedUser = $this->googleAuthService->linkAuthenticatedUser($user, $googleUser);
        } catch (GoogleAuthException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], $exception->status());
        }

        $this->syncUserRoleFromEmail($linkedUser);

        return response()->json([
            'message' => 'Google account linked successfully.',
            'user' => $this->serializeUser($linkedUser),
        ]);
    }

    private function syncUserRoleFromEmail(User $user): string
    {
        $detectedRole = $this->detectUserRoleOrFail((string) $user->email);
        if ($user->role !== $detectedRole) {
            $user->forceFill(['role' => $detectedRole])->save();
            $user->refresh();
        }

        return $detectedRole;
    }

    private function detectUserRoleOrFail(string $email): string
    {
        $role = $this->roleDetectionService->detectUserRole($email);
        if ($role === null) {
            throw ValidationException::withMessages([
                'email' => ['Unable to determine user role from email format.'],
            ]);
        }

        return $role;
    }

    private function serializeUser(User $user): array
    {
        return $user->only([
            'id',
            'name',
            'email',
            'role',
            'phone',
            'university_id',
            'department',
            'google_avatar',
            'auth_provider',
        ]);
    }

    private function redirectToFrontendLogin(array $params = []): RedirectResponse
    {
        $baseUrl = trim((string) config('services.google.frontend_redirect'));
        $query = http_build_query(array_filter(
            $params,
            static fn (mixed $value): bool => $value !== null && $value !== ''
        ));

        $target = $baseUrl !== '' ? $baseUrl : url('/login');
        if ($query !== '') {
            $target .= (str_contains($target, '?') ? '&' : '?') . $query;
        }

        return redirect()->away($target);
    }
}
