<?php

namespace Tests\Unit;

use App\Http\Services\Auth\RoleDetectionService;
use Tests\TestCase;

class RoleDetectionServiceTest extends TestCase
{
    private RoleDetectionService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RoleDetectionService();
    }

    public function test_detects_student_from_three_part_aust_email(): void
    {
        $this->assertSame('student', $this->service->detectUserRole('john.alex.123@aust.edu'));
    }

    public function test_detects_teacher_from_two_part_aust_email(): void
    {
        $this->assertSame('teacher', $this->service->detectUserRole('john.alex@aust.edu'));
    }

    public function test_detects_allowlisted_admin_email(): void
    {
        config()->set('auth_roles.admin_emails', ['admin@example.com']);
        config()->set('auth_roles.allowlisted_emails', ['admin@example.com']);

        $this->assertSame('admin', $this->service->detectUserRole('admin@example.com'));
    }

    public function test_defaults_unknown_non_aust_email_to_student(): void
    {
        $this->assertSame('student', $this->service->detectUserRole('visitor@example.com'));
    }
}
