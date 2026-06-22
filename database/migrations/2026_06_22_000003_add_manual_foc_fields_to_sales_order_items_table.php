<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->foreignId('foc_unit_id')->nullable()->after('unit_id')->constrained('units')->nullOnDelete();
            $table->unsignedInteger('foc_quantity')->default(0)->after('quantity');
            $table->unsignedInteger('foc_conversion_factor_to_base')->default(1)->after('conversion_factor_to_base');
        });
    }

    public function down(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('foc_unit_id');
            $table->dropColumn([
                'foc_quantity',
                'foc_conversion_factor_to_base',
            ]);
        });
    }
};
