<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('original_total_amount', 15, 2)->default(0)->after('total_amount');
            $table->decimal('return_credit_amount', 15, 2)->default(0)->after('original_total_amount');
            $table->decimal('net_collectible_amount', 15, 2)->default(0)->after('return_credit_amount');
            $table->string('settlement_status', 40)->default('unpaid')->after('balance_amount');
            $table->timestamp('settlement_calculated_at')->nullable()->after('settlement_status');
            $table->timestamp('cash_back_approved_at')->nullable()->after('cash_back_amount');
            $table->foreignId('cash_back_approved_by')->nullable()->after('cash_back_approved_at')->constrained('users')->nullOnDelete();

            $table->index(['invoice_date', 'status'], 'invoices_date_document_status_idx');
            $table->index(['due_date', 'settlement_status'], 'invoices_due_settlement_idx');
            $table->index(['customer_id', 'settlement_status'], 'invoices_customer_settlement_idx');
            $table->index(['company_id', 'invoice_date'], 'invoices_company_date_idx');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('idempotency_key', 100)->nullable()->after('payment_no');
            $table->unique('idempotency_key', 'payments_idempotency_unique');
        });

        Schema::table('stock_receipts', function (Blueprint $table) {
            $table->string('idempotency_key', 100)->nullable()->after('receipt_no');
            $table->unique('idempotency_key', 'stock_receipts_idempotency_unique');
        });

        Schema::table('sales_returns', function (Blueprint $table) {
            $table->string('idempotency_key', 100)->nullable()->after('return_no');
            $table->string('credit_note_no', 100)->nullable()->after('idempotency_key');
            $table->string('reason_code', 50)->nullable()->after('reason');
            $table->decimal('tax_amount', 15, 2)->default(0)->after('total_amount');
            $table->timestamp('posted_at')->nullable()->after('status');
            $table->foreignId('posted_by')->nullable()->after('posted_at')->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable()->after('posted_by');
            $table->foreignId('voided_by')->nullable()->after('voided_at')->constrained('users')->nullOnDelete();

            $table->unique('idempotency_key', 'sales_returns_idempotency_unique');
            $table->unique('credit_note_no', 'sales_returns_credit_note_unique');
        });

        Schema::table('sales_return_items', function (Blueprint $table) {
            $table->decimal('tax_amount', 15, 2)->default(0)->after('line_total');
        });

        Schema::create('sales_return_foc_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->cascadeOnDelete();
            $table->foreignId('sales_order_foc_item_id')->constrained('sales_order_foc_items');
            $table->foreignId('product_id')->constrained('products');
            $table->unsignedInteger('base_unit_quantity');
            $table->decimal('estimated_value_amount', 15, 2)->default(0);
            $table->string('disposition', 40);
            $table->string('status', 40)->default('posted');
            $table->text('reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['sales_order_foc_item_id', 'status'], 'return_foc_source_status_idx');
        });

        Schema::create('sales_return_commission_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->cascadeOnDelete();
            $table->foreignId('sales_return_item_id')->constrained('sales_return_items')->cascadeOnDelete();
            $table->foreignId('sales_order_item_id')->nullable()->constrained('sales_order_items')->nullOnDelete();
            $table->decimal('original_commission_amount', 15, 2)->default(0);
            $table->decimal('reversal_amount', 15, 2)->default(0);
            $table->string('calculation_basis', 80)->default('proportional_return');
            $table->string('status', 40)->default('posted');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->unique('sales_return_item_id', 'return_commission_item_unique');
            $table->index(['sales_order_item_id', 'status'], 'return_commission_source_status_idx');
        });

        Schema::table('company_payments', function (Blueprint $table) {
            $table->string('source_type', 100)->nullable()->after('company_payable_id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->string('idempotency_key', 100)->nullable()->after('source_id');

            $table->index(['source_type', 'source_id'], 'company_payments_source_idx');
            $table->unique('idempotency_key', 'company_payments_idempotency_unique');
        });

        Schema::create('customer_credits', function (Blueprint $table) {
            $table->id();
            $table->string('credit_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('available_amount', 15, 2)->default(0);
            $table->string('status', 40)->default('available');
            $table->string('source_type', 100);
            $table->unsignedBigInteger('source_id');
            $table->string('idempotency_key', 100)->unique();
            $table->date('credit_date');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['customer_id', 'company_id', 'status'], 'customer_credits_party_status_idx');
            $table->index(['source_type', 'source_id'], 'customer_credits_source_idx');
        });

        Schema::create('customer_charge_adjustments', function (Blueprint $table) {
            $table->id();
            $table->string('adjustment_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('sales_return_id')->nullable()->constrained('sales_returns')->nullOnDelete();
            $table->foreignId('sales_return_foc_item_id')->nullable()->constrained('sales_return_foc_items')->nullOnDelete();
            $table->date('adjustment_date');
            $table->decimal('amount', 15, 2);
            $table->string('status', 40)->default('posted');
            $table->text('reason');
            $table->string('idempotency_key', 120)->unique();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'company_id', 'status'], 'customer_charge_party_status_idx');
            $table->index(['adjustment_date', 'status'], 'customer_charge_date_status_idx');
        });

        Schema::create('financial_data_repairs', function (Blueprint $table) {
            $table->id();
            $table->string('repair_key', 160)->unique();
            $table->string('repair_version', 60);
            $table->string('target_table', 100);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('before_values')->nullable();
            $table->json('after_values')->nullable();
            $table->text('reason');
            $table->foreignId('executed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('executed_at');
            $table->timestamps();

            $table->index(['repair_version', 'target_table'], 'financial_repairs_version_target_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_data_repairs');
        Schema::dropIfExists('customer_charge_adjustments');
        Schema::dropIfExists('customer_credits');

        Schema::table('company_payments', function (Blueprint $table) {
            $table->dropUnique('company_payments_idempotency_unique');
            $table->dropIndex('company_payments_source_idx');
            $table->dropColumn(['source_type', 'source_id', 'idempotency_key']);
        });

        Schema::dropIfExists('sales_return_commission_adjustments');
        Schema::dropIfExists('sales_return_foc_items');

        Schema::table('sales_return_items', function (Blueprint $table) {
            $table->dropColumn('tax_amount');
        });

        Schema::table('sales_returns', function (Blueprint $table) {
            $table->dropUnique('sales_returns_idempotency_unique');
            $table->dropUnique('sales_returns_credit_note_unique');
            $table->dropForeign(['posted_by']);
            $table->dropForeign(['voided_by']);
            $table->dropColumn(['idempotency_key', 'credit_note_no', 'reason_code', 'tax_amount', 'posted_at', 'posted_by', 'voided_at', 'voided_by']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique('payments_idempotency_unique');
            $table->dropColumn('idempotency_key');
        });

        Schema::table('stock_receipts', function (Blueprint $table) {
            $table->dropUnique('stock_receipts_idempotency_unique');
            $table->dropColumn('idempotency_key');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_date_document_status_idx');
            $table->dropIndex('invoices_due_settlement_idx');
            $table->dropIndex('invoices_customer_settlement_idx');
            $table->dropIndex('invoices_company_date_idx');
            $table->dropForeign(['cash_back_approved_by']);
            $table->dropColumn([
                'original_total_amount',
                'return_credit_amount',
                'net_collectible_amount',
                'settlement_status',
                'settlement_calculated_at',
                'cash_back_approved_at',
                'cash_back_approved_by',
            ]);
        });
    }
};
