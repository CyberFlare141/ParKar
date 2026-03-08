<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE documents MODIFY COLUMN document_type ENUM('license','registration','insurance','id_card','vehicle_photo') NOT NULL"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE documents MODIFY COLUMN document_type ENUM('license','registration','insurance','id_card') NOT NULL"
            );
        }
    }
};
