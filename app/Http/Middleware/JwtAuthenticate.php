<?php

namespace App\Http\Middleware;

use App\Http\Services\Auth\JwtService;
use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class JwtAuthenticate
{
    public function __construct(private readonly JwtService $jwtService)
    {
    }

    public function handle(Request $request, Closure $next): mixed
    {
        $authorization = (string) $request->header('Authorization', '');
        if (!preg_match('/^\s*Bearer\s+(.+)$/i', $authorization, $matches)) {
            return $this->unauthorized('Missing Bearer token.');
        }

        $token = trim((string) ($matches[1] ?? ''));
        if ($token === '') {
            return $this->unauthorized('Missing Bearer token.');
        }

        $parsedToken = $this->jwtService->parseAndValidate($token);
        if (!$parsedToken) {
            return $this->unauthorized('Invalid or expired token.');
        }

        $userId = $parsedToken->claims()->get('userId', null);
        if (!is_numeric($userId)) {
            return $this->unauthorized('Invalid token payload.');
        }

        /** @var User|null $user */
        $user = User::query()->find((int) $userId);
        if (!$user || !$user->is_active) {
            return $this->unauthorized('The authenticated user is unavailable.');
        }

        Auth::setUser($user);
        $request->setUserResolver(static fn (): User => $user);

        return $next($request);
    }

    private function unauthorized(string $message): JsonResponse
    {
        Log::warning('JWT authentication failed.', [
            'message' => $message,
            'path' => request()?->path(),
            'ip' => request()?->ip(),
            'has_authorization_header' => request()?->hasHeader('Authorization'),
        ]);

        return response()->json([
            'message' => $message,
        ], 401);
    }
}
