<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('id')->constrained('roles')->nullOnDelete();
            $table->string('phone')->nullable()->after('email');
            $table->enum('user_type', ['office', 'sales'])->default('office')->after('phone');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active')->after('user_type');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
            $table->softDeletes();
        });

        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('parent_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('abbreviation')->unique();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('product_category_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->foreignId('base_unit_id')->constrained('units');
            $table->string('sku')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('primary_image_path')->nullable();
            $table->decimal('default_discount_percentage', 5, 2)->default(0);
            $table->decimal('commission_rate_percentage', 5, 2)->default(0);
            $table->unsignedInteger('low_stock_threshold_base_units')->default(0);
            $table->enum('status', ['active', 'inactive', 'discontinued'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['product_category_id', 'brand_id']);
        });

        Schema::create('product_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained('units');
            $table->unsignedInteger('conversion_factor_to_base')->default(1);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->boolean('is_base_unit')->default(false);
            $table->boolean('is_default_sales_unit')->default(false);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->unique(['product_id', 'unit_id']);
            $table->index(['product_id', 'status']);
        });

        Schema::create('sales_representatives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained('companies');
            $table->string('employee_code')->unique();
            $table->string('phone')->nullable();
            $table->string('region')->nullable();
            $table->date('joined_at')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('owner_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('township')->nullable();
            $table->string('city')->nullable();
            $table->string('region')->nullable();
            $table->foreignId('assigned_sales_representative_id')->nullable()->constrained('sales_representatives')->nullOnDelete();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['assigned_sales_representative_id', 'status']);
            $table->index(['region', 'city']);
        });

        Schema::create('customer_company_credit_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->enum('credit_status', ['active', 'warning', 'blocked'])->default('active');
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->decimal('outstanding_balance', 15, 2)->default(0);
            $table->unsignedBigInteger('blocked_invoice_id')->nullable();
            $table->unsignedSmallInteger('overdue_days')->default(0);
            $table->text('reason')->nullable();
            $table->timestamp('blocked_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'company_id']);
            $table->index(['company_id', 'credit_status']);
        });

        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('address')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('stock_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->date('received_date');
            $table->string('supplier_invoice_no')->nullable();
            $table->date('payable_due_date')->nullable();
            $table->decimal('subtotal_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('due_amount', 15, 2)->default(0);
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid');
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'received_date']);
            $table->index(['warehouse_id', 'status']);
        });

        Schema::create('stock_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_receipt_id')->constrained('stock_receipts')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('unit_id')->constrained('units');
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('conversion_factor_to_base')->default(1);
            $table->unsignedInteger('base_unit_quantity')->default(0);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->string('batch_no')->nullable();
            $table->date('manufactured_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'batch_no']);
            $table->index(['expiry_date']);
        });

        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->string('batch_no')->nullable();
            $table->date('expiry_date')->nullable();
            $table->unsignedInteger('received_base_quantity')->default(0);
            $table->unsignedInteger('available_base_quantity')->default(0);
            $table->unsignedInteger('reserved_base_quantity')->default(0);
            $table->unsignedInteger('sold_base_quantity')->default(0);
            $table->unsignedInteger('damaged_base_quantity')->default(0);
            $table->unsignedInteger('expired_base_quantity')->default(0);
            $table->timestamps();

            $table->index(['company_id', 'product_id']);
            $table->index(['warehouse_id', 'product_id']);
            $table->index(['batch_no', 'expiry_date']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('stock_batch_id')->nullable()->constrained('stock_batches')->nullOnDelete();
            $table->enum('movement_type', ['receipt', 'reserve', 'release', 'sale', 'adjustment', 'damage', 'expiry', 'return']);
            $table->integer('base_unit_quantity');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['company_id', 'movement_type']);
            $table->index(['reference_type', 'reference_id']);
        });

        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->string('adjustment_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('stock_batch_id')->nullable()->constrained('stock_batches')->nullOnDelete();
            $table->enum('adjustment_type', ['increase', 'decrease', 'damage', 'expiry']);
            $table->unsignedInteger('base_unit_quantity')->default(0);
            $table->text('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('foc_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->enum('rule_type', ['quantity', 'value'])->default('quantity');
            $table->unsignedInteger('minimum_quantity_base_units')->nullable();
            $table->decimal('minimum_order_value', 15, 2)->nullable();
            $table->unsignedInteger('reward_quantity_base_units')->default(0);
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'product_id', 'status']);
            $table->index(['starts_at', 'ends_at']);
        });

        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('sales_representative_id')->nullable()->constrained('sales_representatives')->nullOnDelete();
            $table->date('order_date');
            $table->date('requested_delivery_date')->nullable();
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected', 'invoiced', 'delivered', 'cancelled'])->default('submitted');
            $table->decimal('subtotal_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('foc_value_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['customer_id', 'order_date']);
            $table->index(['sales_representative_id', 'order_date']);
        });

        Schema::create('sales_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('unit_id')->constrained('units');
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('conversion_factor_to_base')->default(1);
            $table->unsignedInteger('base_unit_quantity')->default(0);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->unsignedInteger('foc_base_unit_quantity')->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->decimal('commission_rate_percentage', 5, 2)->default(0);
            $table->decimal('commission_amount', 15, 2)->default(0);
            $table->timestamps();

            $table->index(['sales_order_id', 'product_id']);
        });

        Schema::create('sales_order_foc_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->foreignId('sales_order_item_id')->nullable()->constrained('sales_order_items')->cascadeOnDelete();
            $table->foreignId('foc_rule_id')->nullable()->constrained('foc_rules')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->unsignedInteger('reward_base_unit_quantity')->default(0);
            $table->decimal('estimated_value_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no')->unique();
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('sales_representative_id')->nullable()->constrained('sales_representatives')->nullOnDelete();
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->enum('status', ['draft', 'issued', 'paid', 'partial', 'void'])->default('issued');
            $table->decimal('subtotal_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('foc_value_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('balance_amount', 15, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['customer_id', 'invoice_date']);
            $table->index(['due_date', 'status']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('sales_order_item_id')->nullable()->constrained('sales_order_items')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('unit_id')->constrained('units');
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('conversion_factor_to_base')->default(1);
            $table->unsignedInteger('base_unit_quantity')->default(0);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->unsignedInteger('foc_base_unit_quantity')->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::table('customer_company_credit_statuses', function (Blueprint $table) {
            $table->foreign('blocked_invoice_id')->references('id')->on('invoices')->nullOnDelete();
        });

        Schema::create('delivery_vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_no')->unique();
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->date('delivery_date');
            $table->enum('status', ['pending', 'delivered', 'cancelled'])->default('pending');
            $table->string('delivered_by')->nullable();
            $table->string('received_by')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('customer_id')->constrained('customers');
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'other'])->default('cash');
            $table->string('reference_no')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'payment_date']);
            $table->index(['customer_id', 'payment_date']);
        });

        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->decimal('allocated_amount', 15, 2);
            $table->timestamps();

            $table->unique(['payment_id', 'invoice_id']);
        });

        Schema::create('customer_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('invoice_total', 15, 2)->default(0);
            $table->decimal('payment_total', 15, 2)->default(0);
            $table->decimal('balance_amount', 15, 2)->default(0);
            $table->timestamp('last_calculated_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'company_id']);
        });

        Schema::create('company_payables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('stock_receipt_id')->nullable()->constrained('stock_receipts')->nullOnDelete();
            $table->date('payable_date');
            $table->date('due_date')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('balance_amount', 15, 2)->default(0);
            $table->enum('status', ['unpaid', 'partial', 'paid', 'overdue'])->default('unpaid');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['due_date', 'status']);
        });

        Schema::create('company_payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_no')->unique();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('company_payable_id')->nullable()->constrained('company_payables')->nullOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'other'])->default('cash');
            $table->string('reference_no')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('title');
            $table->text('body')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index(['type', 'created_at']);
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_group')->default('general');
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('value_type')->default('string');
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('auditable_type')->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('company_payments');
        Schema::dropIfExists('company_payables');
        Schema::dropIfExists('customer_balances');
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('delivery_vouchers');
        Schema::table('customer_company_credit_statuses', function (Blueprint $table) {
            $table->dropForeign(['blocked_invoice_id']);
        });
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('sales_order_foc_items');
        Schema::dropIfExists('sales_order_items');
        Schema::dropIfExists('sales_orders');
        Schema::dropIfExists('foc_rules');
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stock_batches');
        Schema::dropIfExists('stock_receipt_items');
        Schema::dropIfExists('stock_receipts');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('customer_company_credit_statuses');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('sales_representatives');
        Schema::dropIfExists('product_units');
        Schema::dropIfExists('products');
        Schema::dropIfExists('units');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('product_categories');
        Schema::dropIfExists('companies');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn(['role_id', 'phone', 'user_type', 'status', 'last_login_at', 'deleted_at']);
        });

        Schema::dropIfExists('roles');
    }
};
