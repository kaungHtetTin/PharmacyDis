<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_batches', function (Blueprint $table) {
            $table->decimal('base_unit_cost', 18, 6)->nullable()->after('expiry_date');
            $table->string('cost_source', 50)->nullable()->after('base_unit_cost');
        });

        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->decimal('base_unit_cost', 18, 6)->nullable()->after('base_unit_quantity');
            $table->string('cost_source', 50)->nullable()->after('base_unit_cost');
        });

        Schema::table('sales_return_items', function (Blueprint $table) {
            $table->decimal('base_unit_cost', 18, 6)->nullable()->after('base_unit_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('sales_return_items', function (Blueprint $table) {
            $table->dropColumn('base_unit_cost');
        });

        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->dropColumn(['base_unit_cost', 'cost_source']);
        });

        Schema::table('stock_batches', function (Blueprint $table) {
            $table->dropColumn(['base_unit_cost', 'cost_source']);
        });
    }
};
