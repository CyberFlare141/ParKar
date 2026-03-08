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
        Schema::create('audit_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('application_id')->constrained('parking_applications')->cascadeOnDelete();
    $table->enum('action', ['approved','rejected','updated']);
    $table->text('reason')->nullable();
    $table->timestamp('created_at')->nullable();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
