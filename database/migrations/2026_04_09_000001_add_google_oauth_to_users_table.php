<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('google_id', 100)->nullable()->unique()->after('email');
            $table->string('google_avatar', 512)->nullable()->after('google_id');
            $table->string('password')->nullable()->change();
            $table->enum('auth_provider', ['local', 'google', 'both'])->default('local')->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_google_id_unique');
            $table->dropColumn(['google_id', 'google_avatar', 'auth_provider']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
