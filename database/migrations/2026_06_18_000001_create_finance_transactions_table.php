<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('finance_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no')->unique();
            $table->enum('direction', ['income', 'outcome']);
            $table->string('category')->default('other');
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->date('transaction_date');
            $table->decimal('amount', 15, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'other'])->default('cash');
            $table->string('reference_no')->nullable();
            $table->text('description')->nullable();
            $table->string('source_type')->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->enum('status', ['recorded', 'void'])->default('recorded');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['direction', 'transaction_date']);
            $table->index(['company_id', 'transaction_date']);
            $table->index(['source_type', 'source_id']);
            $table->index(['status', 'transaction_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('finance_transactions');
    }
};
