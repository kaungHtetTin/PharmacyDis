<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['assigned_sales_representative_id']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['assigned_sales_representative_id', 'status']);
            $table->dropColumn('assigned_sales_representative_id');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->foreignId('assigned_sales_representative_id')
                ->nullable()
                ->after('region')
                ->constrained('sales_representatives')
                ->nullOnDelete();
            $table->index(['assigned_sales_representative_id', 'status']);
        });
    }
};
