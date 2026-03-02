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
        Schema::create('ai_analysis', function (Blueprint $table) {
    $table->id();
    $table->foreignId('application_id')->constrained('parking_applications')->cascadeOnDelete();

    $table->float('blurry_score')->nullable();
    $table->float('name_match_score')->nullable();
    $table->boolean('expiry_valid')->nullable();
    $table->boolean('renewal_recommendation')->nullable();
    $table->float('risk_score')->nullable();

    $table->json('raw_response')->nullable();

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_analysis');
    }
};
