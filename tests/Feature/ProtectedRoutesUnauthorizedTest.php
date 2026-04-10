<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProtectedRoutesUnauthorizedTest extends TestCase
{
    /**
     * @dataProvider protectedRouteProvider
     */
    public function test_protected_routes_reject_missing_bearer_token(string $method, string $uri): void
    {
        $this->json($method, $uri)
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Missing Bearer token.',
            ]);
    }

    public static function protectedRouteProvider(): array
    {
        return [
            'current user' => ['GET', '/api/auth/me'],
            'logout' => ['POST', '/api/auth/logout'],
            'items index' => ['GET', '/api/items'],
            'admin dashboard' => ['GET', '/api/admin/dashboard'],
            'student dashboard' => ['GET', '/api/student/dashboard'],
            'teacher dashboard' => ['GET', '/api/teacher/dashboard'],
        ];
    }
}
