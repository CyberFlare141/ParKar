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
        Schema::create('parking_applications', function (Blueprint $table) {
    $table->id();

    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
    $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();

    $table->enum('status', ['pending','approved','rejected','expired'])
          ->default('pending');

    $table->float('priority_score')->nullable();
    $table->boolean('ai_flag')->default(false);
    $table->text('admin_comment')->nullable();

    $table->foreignId('reviewed_by')
          ->nullable()
          ->constrained('users')
          ->nullOnDelete();

    $table->timestamp('reviewed_at')->nullable();

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parking_applications');
    }
};
