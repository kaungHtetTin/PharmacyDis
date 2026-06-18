<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_image_path')->nullable()->after('phone');
        });

        Schema::table('sales_representatives', function (Blueprint $table) {
            $table->text('profile_note')->nullable()->after('region');
        });
    }

    public function down()
    {
        Schema::table('sales_representatives', function (Blueprint $table) {
            $table->dropColumn('profile_note');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_image_path');
        });
    }
};
