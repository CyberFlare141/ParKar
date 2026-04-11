<?php

namespace Tests\Feature;

use App\Http\Middleware\JwtAuthenticate;
use App\Http\Middleware\StudentMiddleware;
use App\Http\Services\Ai\AiDocumentService;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery\MockInterface;
use Tests\TestCase;

class StudentParkingApplicationCreateTest extends TestCase
{
    use CreatesParkingApplicationTables;

    protected function setUp(): void
    {
        parent::setUp();

        $this->useInMemoryParkingDatabase();
    }

    public function test_student_can_create_parking_application_with_documents(): void
    {
        Storage::fake('public');

        $this->mock(AiDocumentService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('analyse')
                ->times(4)
                ->andReturn([
                    'is_car_document' => true,
                    'clarity' => 'clear',
                    'confidence' => 0.98,
                    'issues' => [],
                    'error' => null,
                ]);
        });

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

        $this->withoutMiddleware([
            JwtAuthenticate::class,
            StudentMiddleware::class,
        ]);

        $this->actingAs($student)
            ->post('/api/student/parking-applications', [
                'name' => 'John Alex',
                'aust_id' => 'AUST-123',
                'study_semester' => '3.2',
                'email' => 'john.alex.123@aust.edu',
                'contact_phone' => '01700000000',
                'vehicle_plate' => 'dhaka-123',
                'vehicle_type' => 'car',
                'vehicle_model' => 'Corolla',
                'vehicle_color' => 'White',
                'vehicle_brand' => 'Toyota',
                'registration_number' => 'REG-123',
                'notes' => 'Need campus parking.',
                'nda_signed' => true,
                'documents' => [
                    'vehicle_registration_certificate' => UploadedFile::fake()->create('registration.pdf', 100, 'application/pdf'),
                    'driving_license' => UploadedFile::fake()->create('license.pdf', 100, 'application/pdf'),
                    'university_id_card' => UploadedFile::fake()->create('id-card.pdf', 100, 'application/pdf'),
                    'vehicle_photo' => UploadedFile::fake()->create('vehicle.png', 100, 'image/png'),
                ],
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJson([
                'message' => 'Parking application submitted successfully.',
                'data' => [
                    'status' => 'pending',
                    'ai_verification' => [
                        'passed' => true,
                        'rejected' => false,
                        'manual_review' => false,
                    ],
                ],
            ])
            ->assertJsonStructure([
                'data' => [
                    'application_id',
                    'ai_verification' => [
                        'summary',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('vehicles', [
            'user_id' => $student->id,
            'plate_number' => 'DHAKA-123',
            'vehicle_type' => 'car',
            'brand' => 'Toyota',
            'model' => 'Corolla',
        ]);

        $this->assertDatabaseHas('parking_applications', [
            'user_id' => $student->id,
            'semester_id' => $semester->id,
            'status' => 'pending',
            'applicant_name' => 'John Alex',
            'applicant_university_id' => 'AUST-123',
            'notes' => "Study Semester: 3.2\nNotes: Need campus parking.",
            'nda_signed' => true,
        ]);

        $this->assertDatabaseCount('documents', 4);
        $this->assertDatabaseCount('application_documents', 4);
        $this->assertDatabaseCount('ai_analysis', 1);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'title' => 'Application submitted',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'title' => 'New parking application',
        ]);
    }
}
