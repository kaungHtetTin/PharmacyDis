<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('stock_receipt_items', function (Blueprint $table) {
            $table->foreignId('foc_unit_id')->nullable()->after('unit_id')->constrained('units')->nullOnDelete();
            $table->unsignedInteger('foc_quantity')->default(0)->after('quantity');
            $table->unsignedInteger('foc_conversion_factor_to_base')->default(1)->after('conversion_factor_to_base');
            $table->unsignedInteger('foc_base_unit_quantity')->default(0)->after('base_unit_quantity');
            $table->decimal('commission_rate_percentage', 5, 2)->default(0)->after('unit_cost');
            $table->decimal('commission_amount', 15, 2)->default(0)->after('commission_rate_percentage');
        });
    }

    public function down()
    {
        Schema::table('stock_receipt_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('foc_unit_id');
            $table->dropColumn([
                'foc_quantity',
                'foc_conversion_factor_to_base',
                'foc_base_unit_quantity',
                'commission_rate_percentage',
                'commission_amount',
            ]);
        });
    }
};
