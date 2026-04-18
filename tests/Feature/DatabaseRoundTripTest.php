<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseRoundTripTest extends TestCase
{
    public function test_database_can_write_and_read_a_record(): void
    {
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        DB::purge('sqlite');

        Schema::connection('sqlite')->create('ci_smoke_records', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
        });

        try {
            DB::connection('sqlite')->table('ci_smoke_records')->insert([
                'name' => 'round-trip',
            ]);

            $this->assertSame(
                'round-trip',
                DB::connection('sqlite')->table('ci_smoke_records')->value('name')
            );
        } finally {
            Schema::connection('sqlite')->dropIfExists('ci_smoke_records');
        }
    }
}
