<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('finance_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->enum('direction', ['income', 'outcome', 'both'])->default('both');
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['direction', 'status']);
        });

        DB::table('finance_categories')->insert([
            ['name' => 'Sales collection', 'code' => 'sales_collection', 'direction' => 'income', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Owner capital', 'code' => 'owner_capital', 'direction' => 'income', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Other income', 'code' => 'other_income', 'direction' => 'income', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Supplier payment', 'code' => 'supplier_payment', 'direction' => 'outcome', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Operating expense', 'code' => 'operating_expense', 'direction' => 'outcome', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Salary', 'code' => 'salary', 'direction' => 'outcome', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Transport', 'code' => 'transport', 'direction' => 'outcome', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Other outcome', 'code' => 'other_outcome', 'direction' => 'outcome', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Adjustment', 'code' => 'adjustment', 'direction' => 'both', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('finance_categories');
    }
};
