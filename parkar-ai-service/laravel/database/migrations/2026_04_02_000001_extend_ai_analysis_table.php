<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends ai_analysis to store per-document JSON results and a risk score.
 * Run: php artisan migrate
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_analysis', function (Blueprint $table) {
            // Store full per-document AI result objects
            // (already exists as raw_response json – no change needed if you
            //  used the original migration; this migration is a no-op if the
            //  column is already there)
            if (! Schema::hasColumn('ai_analysis', 'raw_response')) {
                $table->json('raw_response')->nullable()->after('risk_score');
            }
        });
    }

    public function down(): void
    {
        // intentionally left empty – do not drop raw_response
    }
};
