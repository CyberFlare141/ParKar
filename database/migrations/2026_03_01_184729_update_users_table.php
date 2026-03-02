<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
 public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['student','teacher','admin'])
                  ->default('student')
                  ->after('password');

            $table->string('university_id', 50)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('phone', 20)->nullable();
            $table->boolean('is_active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'university_id',
                'department',
                'phone',
                'is_active'
            ]);
        });
    }
};
