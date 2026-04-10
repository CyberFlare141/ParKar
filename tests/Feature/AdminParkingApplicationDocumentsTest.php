<?php

namespace Tests\Feature;

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\JwtAuthenticate;
use App\Models\Document;
use App\Models\ParkingApplication;
use App\Models\Semester;
use App\Models\User;
use App\Models\Vehicle;
use Tests\TestCase;

class AdminParkingApplicationDocumentsTest extends TestCase
{
    use CreatesParkingApplicationTables;

    protected function setUp(): void
    {
        parent::setUp();

        $this->useInMemoryParkingDatabase();
    }

    public function test_admin_can_list_documents_for_parking_application(): void
    {
        $admin = User::query()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => 'hashed-password',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $student = User::query()->create([
            'name' => 'John Alex',
            'email' => 'john.alex.123@aust.edu',
            'password' => 'hashed-password',
            'role' => 'student',
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

        $license = Document::query()->create([
            'user_id' => $student->id,
            'document_type' => 'license',
            'file_path' => 'parking-documents/1/license.pdf',
            'is_verified' => false,
        ]);

        $registration = Document::query()->create([
            'user_id' => $student->id,
            'document_type' => 'registration',
            'file_path' => 'parking-documents/1/registration.pdf',
            'is_verified' => true,
        ]);

        $application->documents()->attach($license->id, ['created_at' => now()]);
        $application->documents()->attach($registration->id, ['created_at' => now()]);

        $this->withoutMiddleware([
            JwtAuthenticate::class,
            AdminMiddleware::class,
        ]);

        $this->actingAs($admin)
            ->getJson("/api/admin/parking-applications/{$application->id}/documents")
            ->assertOk()
            ->assertJsonPath('data.application_id', $application->id)
            ->assertJsonCount(2, 'data.documents')
            ->assertJsonFragment([
                'id' => $license->id,
                'document_type' => 'license',
                'file_path' => 'parking-documents/1/license.pdf',
                'is_verified' => false,
            ])
            ->assertJsonFragment([
                'id' => $registration->id,
                'document_type' => 'registration',
                'file_path' => 'parking-documents/1/registration.pdf',
                'is_verified' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'application_id',
                    'documents' => [
                        [
                            'id',
                            'document_type',
                            'file_path',
                            'is_verified',
                            'created_at',
                            'view_url',
                            'download_url',
                        ],
                    ],
                ],
            ]);
    }
}
