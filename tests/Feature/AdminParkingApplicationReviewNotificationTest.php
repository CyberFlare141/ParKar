<?php

namespace Tests\Feature;

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\JwtAuthenticate;
use App\Models\ParkingApplication;
use App\Models\Semester;
use App\Models\User;
use App\Models\Vehicle;
use Tests\TestCase;

class AdminParkingApplicationReviewNotificationTest extends TestCase
{
    use CreatesParkingApplicationTables;

    protected function setUp(): void
    {
        parent::setUp();

        $this->useInMemoryParkingDatabase();
    }

    public function test_admin_review_creates_notification_for_applicant(): void
    {
        $student = User::query()->create([
            'name' => 'John Alex',
            'email' => 'john.alex.123@aust.edu',
            'password' => 'hashed-password',
            'role' => 'student',
            'is_active' => true,
        ]);

        $admin = User::query()->create([
            'name' => 'Admin User',
            'email' => 'admin.parkar@aust.edu',
            'password' => 'hashed-password',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $semester = Semester::query()->create([
            'name' => 'Spring 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-06-30',
            'vehicle_quota' => 1,
            'semester_fee' => 50,
            'is_active' => true,
        ]);

        $vehicle = Vehicle::query()->create([
            'user_id' => $student->id,
            'plate_number' => 'DHAKA-123',
            'vehicle_type' => 'car',
            'brand' => 'Toyota',
            'model' => 'Corolla',
            'color' => 'White',
            'registration_number' => 'REG-123',
        ]);

        $application = ParkingApplication::query()->create([
            'user_id' => $student->id,
            'semester_id' => $semester->id,
            'vehicle_id' => $vehicle->id,
            'status' => 'pending',
            'register_as' => 'student',
            'applicant_name' => 'John Alex',
            'applicant_university_id' => 'AUST-123',
            'applicant_email' => 'john.alex.123@aust.edu',
            'applicant_phone' => '01700000000',
            'nda_signed' => true,
        ]);

        $this->withoutMiddleware([
            JwtAuthenticate::class,
            AdminMiddleware::class,
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/parking-applications/{$application->id}/status", [
                'status' => 'approved',
                'parking_slot' => 'A-12',
            ])
            ->assertOk()
            ->assertJson([
                'message' => 'Application approved and ticket issued.',
                'data' => [
                    'id' => $application->id,
                    'status' => 'approved',
                ],
            ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'title' => 'Application approved',
        ]);
        $this->assertDatabaseHas('parking_tickets', [
            'application_id' => $application->id,
            'parking_slot' => 'A-12',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'admin_id' => $admin->id,
            'application_id' => $application->id,
            'action' => 'approved',
        ]);
    }
}
