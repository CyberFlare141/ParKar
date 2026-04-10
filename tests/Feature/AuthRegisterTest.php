<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        DB::purge('sqlite');

        $this->createAuthTables();
    }

    public function test_register_creates_user_and_otp_challenge(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/register', [
            'fullName' => 'John Alex',
            'email' => 'john.alex.123@aust.edu',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'studentId' => 'AUST-123',
            'department' => 'CSE',
        ])
            ->assertCreated()
            ->assertJson([
                'message' => 'Registration successful. Please verify the OTP to activate your account.',
                'requires_otp' => true,
                'purpose' => 'register',
                'channel' => 'email',
            ])
            ->assertJsonStructure([
                'challenge_id',
                'expires_at',
            ]);

        $this->assertDatabaseHas('users', [
            'name' => 'John Alex',
            'email' => 'john.alex.123@aust.edu',
            'role' => 'student',
            'university_id' => 'AUST-123',
            'department' => 'CSE',
            'is_active' => true,
        ]);

        $userId = DB::table('users')
            ->where('email', 'john.alex.123@aust.edu')
            ->value('id');

        $this->assertDatabaseHas('auth_otps', [
            'user_id' => $userId,
            'purpose' => 'register',
            'channel' => 'email',
            'attempts' => 0,
        ]);
    }

    private function createAuthTables(): void
    {
        Schema::dropIfExists('auth_otps');
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

        Schema::create('auth_otps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id');
            $table->string('challenge_id', 64)->unique();
            $table->string('purpose');
            $table->string('channel')->default('email');
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts')->default(5);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('invalidated_at')->nullable();
            $table->timestamp('last_attempt_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }
}
