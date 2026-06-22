<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $this->call(InitialDataSeeder::class);

        // Sample/business data seeders are intentionally disabled for clean installs.
        // $this->call(RealDataSeeder::class);
        // $this->call(RolesAndSampleDataSeeder::class);
    }
}
