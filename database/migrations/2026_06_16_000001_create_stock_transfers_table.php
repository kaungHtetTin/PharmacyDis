<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        DB::statement("ALTER TABLE stock_movements MODIFY movement_type ENUM('receipt', 'reserve', 'release', 'sale', 'adjustment', 'damage', 'expiry', 'return', 'transfer')");

        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('source_warehouse_id')->constrained('warehouses');
            $table->foreignId('destination_warehouse_id')->constrained('warehouses');
            $table->foreignId('product_id')->nullable()->constrained('products');
            $table->foreignId('unit_id')->nullable()->constrained('units');
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('base_unit_quantity')->default(0);
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'created_at']);
            $table->index(['source_warehouse_id', 'destination_warehouse_id'], 'stock_transfers_route_idx');
        });
    }

    public function down()
    {
        Schema::dropIfExists('stock_transfers');

        DB::table('stock_movements')->where('movement_type', 'transfer')->delete();
        DB::statement("ALTER TABLE stock_movements MODIFY movement_type ENUM('receipt', 'reserve', 'release', 'sale', 'adjustment', 'damage', 'expiry', 'return')");
    }
};
