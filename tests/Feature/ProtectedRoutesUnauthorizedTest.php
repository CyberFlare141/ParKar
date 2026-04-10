<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

class ProtectedRoutesUnauthorizedTest extends TestCase
{
    /**
     * @dataProvider protectedRouteProvider
     */
    public function test_protected_routes_reject_missing_bearer_token(string $method, string $uri, string $path): void
    {
        Log::shouldReceive('warning')
            ->once()
            ->with('JWT authentication failed.', Mockery::on(fn (array $context): bool => $context === [
                'message' => 'Missing Bearer token.',
                'path' => $path,
                'ip' => '127.0.0.1',
                'has_authorization_header' => false,
            ]));

        $this->json($method, $uri)
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Missing Bearer token.',
            ]);
    }

    public static function protectedRouteProvider(): array
    {
        return [
            'current user' => ['GET', '/api/auth/me', 'api/auth/me'],
            'logout' => ['POST', '/api/auth/logout', 'api/auth/logout'],
            'items index' => ['GET', '/api/items', 'api/items'],
            'admin dashboard' => ['GET', '/api/admin/dashboard', 'api/admin/dashboard'],
            'student dashboard' => ['GET', '/api/student/dashboard', 'api/student/dashboard'],
            'teacher dashboard' => ['GET', '/api/teacher/dashboard', 'api/teacher/dashboard'],
        ];
    }
}
