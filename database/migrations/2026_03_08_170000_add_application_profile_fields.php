<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('registration_number', 100)->nullable()->after('color');
        });

        Schema::table('parking_applications', function (Blueprint $table) {
            $table->string('register_as', 20)->nullable()->after('vehicle_id');
            $table->string('applicant_name')->nullable()->after('register_as');
            $table->string('applicant_university_id', 50)->nullable()->after('applicant_name');
            $table->string('applicant_email')->nullable()->after('applicant_university_id');
            $table->string('applicant_phone', 20)->nullable()->after('applicant_email');
            $table->text('notes')->nullable()->after('applicant_phone');
            $table->boolean('nda_signed')->default(false)->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('parking_applications', function (Blueprint $table) {
            $table->dropColumn([
                'register_as',
                'applicant_name',
                'applicant_university_id',
                'applicant_email',
                'applicant_phone',
                'notes',
                'nda_signed',
            ]);
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn('registration_number');
        });
    }
};
