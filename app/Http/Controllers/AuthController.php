<?php

namespace App\Http\Controllers;

use App\Http\Services\Auth\JwtService;
use App\Http\Services\Auth\OtpService;
use App\Http\Services\Auth\RoleDetectionService;
use App\Models\AuthOtp;
use App\Models\User;
use App\Support\AdminPresence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
        private readonly JwtService $jwtService,
        private readonly RoleDetectionService $roleDetectionService
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
            'otp_channel' => ['nullable', 'in:email,phone'],
        ]);

        $email = strtolower(trim((string) $payload['email']));
        $user = User::where('email', $email)->first();

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

        if (($payload['otp_channel'] ?? 'email') === 'phone' && empty($user->phone)) {
            throw ValidationException::withMessages([
                'otp_channel' => ['Phone OTP is unavailable because your account has no phone number.'],
            ]);
        }

        $purpose = $user->email_verified_at ? 'login' : 'register';
        $challenge = $this->otpService->createChallenge(
            $user,
            $purpose,
            $payload['otp_channel'] ?? 'email'
        );

        return response()->json([
            'message' => $purpose === 'register'
                ? 'Account not verified. OTP sent for account verification.'
                : 'OTP sent. Please verify to complete login.',
            'requires_otp' => true,
            'challenge_id' => $challenge['challenge_id'],
            'purpose' => $purpose,
            'channel' => $challenge['channel'],
            'expires_at' => $challenge['expires_at'],
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

        /** @var \App\Models\User $user */
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

        RateLimiter::clear($throttleKey);

        return response()->json([
            'message' => 'OTP verified successfully.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->only(['id', 'name', 'email', 'role', 'phone', 'university_id', 'department']),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'role', 'phone', 'university_id', 'department']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $user */
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
}
