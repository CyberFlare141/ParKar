<?php

namespace App\Http\Services\Auth;

use App\Models\AuthOtp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OtpService
{
    public function createChallenge(User $user, string $purpose, string $channel = 'email'): array
    {
        AuthOtp::query()
            ->where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->whereNull('invalidated_at')
            ->update(['invalidated_at' => now()]);

        $otpCode = $this->generateOtp();
        $expiresAt = now()->addMinutes((int) config('auth.otp.expiry_minutes', 5));

        $record = AuthOtp::query()->create([
            'user_id' => $user->id,
            'challenge_id' => hash('sha256', Str::uuid() . '|' . microtime(true)),
            'purpose' => $purpose,
            'channel' => $channel,
            'code_hash' => Hash::make($otpCode),
            'attempts' => 0,
            'max_attempts' => (int) config('auth.otp.max_attempts', 5),
            'sent_at' => now(),
            'expires_at' => $expiresAt,
            'meta' => ['ip_generated' => request()?->ip()],
        ]);

        $this->dispatchOtp($user, $otpCode, $purpose, $channel);

        return [
            'challenge_id' => $record->challenge_id,
            'expires_at' => $record->expires_at?->toIso8601String(),
            'channel' => $record->channel,
        ];
    }

    public function verifyChallenge(string $challengeId, string $otp, string $purpose): array
    {
        /** @var \App\Models\AuthOtp|null $record */
        $record = AuthOtp::query()
            ->with('user')
            ->where('challenge_id', $challengeId)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->whereNull('invalidated_at')
            ->first();

        if (!$record || !$record->user) {
            return [
                'ok' => false,
                'status' => 404,
                'message' => 'Invalid OTP challenge.',
            ];
        }

        if ($record->expires_at && $record->expires_at->isPast()) {
            $record->update(['invalidated_at' => now()]);
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'OTP has expired. Please request a new OTP.',
            ];
        }

        if ($record->attempts >= $record->max_attempts) {
            $record->update(['invalidated_at' => now()]);
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Maximum OTP attempts reached. Please request a new OTP.',
            ];
        }

        if (!Hash::check($otp, $record->code_hash)) {
            $nextAttempts = $record->attempts + 1;
            $invalidate = $nextAttempts >= $record->max_attempts;
            $record->update([
                'attempts' => $nextAttempts,
                'last_attempt_at' => now(),
                'invalidated_at' => $invalidate ? now() : null,
            ]);

            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Incorrect OTP.',
                'remaining_attempts' => max(0, $record->max_attempts - $nextAttempts),
            ];
        }

        $record->update([
            'consumed_at' => now(),
            'last_attempt_at' => now(),
        ]);

        return [
            'ok' => true,
            'status' => 200,
            'user' => $record->user,
        ];
    }

    private function generateOtp(): string
    {
        return (string) random_int(100000, 999999);
    }

    private function dispatchOtp(User $user, string $otpCode, string $purpose, string $channel): void
    {
        $expiry = (int) config('auth.otp.expiry_minutes', 5);
        $subject = $purpose === 'register' ? 'Account Verification OTP' : 'Login Verification OTP';
        $body = "Your OTP is {$otpCode}. It expires in {$expiry} minutes.";

        if ($channel === 'phone') {
            // SMS gateway integration point; currently logged for local/dev usage.
            Log::info('OTP SMS placeholder', [
                'user_id' => $user->id,
                'phone' => $user->phone,
                'purpose' => $purpose,
                'otp' => $otpCode,
            ]);
            return;
        }

        Mail::raw($body, function ($message) use ($user, $subject): void {
            $message->to($user->email)->subject($subject);
        });
    }
}
