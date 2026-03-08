<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();
        if (!$user) {
            return $this->unauthorized();
        }

        if ($user->role !== 'admin') {
            return $this->forbidden('Admin access is required.');
        }

        return $next($request);
    }

    private function unauthorized(): JsonResponse
    {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }

    private function forbidden(string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
        ], 403);
    }
}
