<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthLoginValidationTest extends TestCase
{
    public function test_login_requires_email_and_password(): void
    {
        $this->postJson('/api/auth/login')
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'email',
                'password',
            ]);
    }
}
