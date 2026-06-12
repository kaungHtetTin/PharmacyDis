<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('brand')->nullable()->after('product_category_id');
        });

        DB::statement(
            'UPDATE products
                LEFT JOIN brands ON brands.id = products.brand_id
                SET products.brand = brands.name
                WHERE products.brand_id IS NOT NULL'
        );

        Schema::table('products', function (Blueprint $table) {
            $table->index('product_category_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['product_category_id', 'brand_id']);
            $table->dropColumn('brand_id');
            $table->index(['product_category_id', 'brand']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['product_category_id', 'brand']);
            $table->foreignId('brand_id')->nullable()->after('brand')->constrained('brands')->nullOnDelete();
        });

        DB::statement(
            'UPDATE products
                LEFT JOIN brands ON brands.name = products.brand
                SET products.brand_id = brands.id
                WHERE products.brand IS NOT NULL'
        );

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('brand');
            $table->index(['product_category_id', 'brand_id']);
        });
    }
};
