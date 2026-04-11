<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait CreatesParkingApplicationTables
{
    private function useInMemoryParkingDatabase(): void
    {
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        DB::purge('sqlite');

        $this->createParkingApplicationTables();
    }

    private function createParkingApplicationTables(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('ai_analysis');
        Schema::dropIfExists('application_documents');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('parking_tickets');
        Schema::dropIfExists('parking_applications');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('semesters');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('google_id')->nullable()->unique();
            $table->string('google_avatar', 512)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->string('auth_provider')->default('local');
            $table->string('role')->default('student');
            $table->string('university_id', 50)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('phone', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('semesters', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('vehicle_quota');
            $table->decimal('semester_fee', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('vehicles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id');
            $table->string('plate_number', 20);
            $table->string('vehicle_type');
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('color', 50)->nullable();
            $table->string('registration_number', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('parking_applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id');
            $table->foreignId('semester_id');
            $table->foreignId('vehicle_id');
            $table->string('register_as', 20)->nullable();
            $table->string('applicant_name')->nullable();
            $table->string('applicant_university_id', 50)->nullable();
            $table->string('applicant_email')->nullable();
            $table->string('applicant_phone', 20)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('nda_signed')->default(false);
            $table->string('status')->default('pending');
            $table->double('priority_score')->nullable();
            $table->boolean('ai_flag')->default(false);
            $table->text('admin_comment')->nullable();
            $table->foreignId('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id');
            $table->string('document_type');
            $table->string('file_path');
            $table->date('expiry_date')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
        });

        Schema::create('application_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id');
            $table->foreignId('document_id');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('ai_analysis', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id');
            $table->double('blurry_score')->nullable();
            $table->double('name_match_score')->nullable();
            $table->boolean('expiry_valid')->nullable();
            $table->boolean('renewal_recommendation')->nullable();
            $table->double('risk_score')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id');
            $table->string('title');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('admin_id');
            $table->foreignId('application_id');
            $table->string('action');
            $table->text('reason')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('parking_tickets', function (Blueprint $table): void {
            $table->id();
            $table->string('ticket_id', 40)->unique();
            $table->foreignId('application_id')->unique();
            $table->timestamp('issue_date');
            $table->string('parking_slot', 40)->nullable();
            $table->timestamps();
        });
    }
}
