<?php

namespace Database\Seeders;

use App\Models\Semester;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class SemesterSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $names = [
            '1.1', '1.2',
            '2.1', '2.2',
            '3.1', '3.2',
            '4.1', '4.2',
            '5.1', '5.2',
        ];

        $start = Carbon::create(2026, 1, 1);

        foreach ($names as $name) {
            $end = (clone $start)->addMonths(6)->subDay();

            Semester::query()->updateOrCreate(
                ['name' => $name],
                [
                    'start_date' => $start->toDateString(),
                    'end_date' => $end->toDateString(),
                    'vehicle_quota' => 500,
                    'semester_fee' => 0,
                    'is_active' => true,
                ]
            );

            $start = (clone $start)->addMonths(6);
        }
    }
}
