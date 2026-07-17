<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CompanyPayable;
use App\Models\CustomerBalance;
use App\Models\CustomerCompanyCreditStatus;
use App\Models\FocRule;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\SalesReturn;
use App\Models\SalesOrder;
use App\Models\SalesRepresentative;
use App\Models\Setting;
use App\Models\StockBatch;
use App\Models\StockTransfer;
use App\Models\Unit;
use App\Models\Warehouse;
use Database\Seeders\RolesAndSampleDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BusinessWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private string $salesToken;
    private string $officeToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndSampleDataSeeder::class);

        $this->salesToken = $this->postJson('/api/auth/login', [
            'email' => 'mayzin@pharmacy.test',
            'password' => 'password',
            'user_type' => 'sales',
        ])->json('token');

        $this->officeToken = $this->postJson('/api/auth/login', [
            'email' => 'admin@pharmacy.test',
            'password' => 'password',
            'user_type' => 'office',
        ])->json('token');
    }

    public function test_office_admin_can_manage_invoice_print_settings(): void
    {
        $this->assertDatabaseMissing('settings', ['key' => 'invoice_print.company_name']);

        $response = $this->withToken($this->officeToken)
            ->getJson('/api/office/settings/invoice-print')
            ->assertOk()
            ->assertJsonPath('settings.0.key', 'invoice_print.company_name');

        $this->assertTrue(
            collect($response->json('settings'))->contains(fn (array $setting) => $setting['key'] === 'invoice_print.company_name')
        );

        $this->withToken($this->officeToken)
            ->putJson('/api/office/settings/invoice-print', [
                'settings' => [
                    ['key' => 'invoice_print.company_name', 'value' => 'My Pharmacy Distribution'],
                    ['key' => 'invoice_print.footer_text', 'value' => 'Please check goods on delivery'],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('settings', [
            'key' => 'invoice_print.company_name',
            'setting_group' => 'invoice_print',
            'value' => 'My Pharmacy Distribution',
        ]);
        $this->assertSame('My Pharmacy Distribution', Setting::where('key', 'invoice_print.company_name')->value('value'));
    }

    public function test_office_admin_can_update_invoice_remark(): void
    {
        $invoice = Invoice::where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

        $this->withToken($this->officeToken)
            ->patchJson("/api/office/invoices/{$invoice->id}/print-details", [
                'remark' => 'Deliver before noon.',
                'sale_type' => 'credit',
                'cash_back_amount' => 10000,
            ])
            ->assertOk()
            ->assertJsonPath('data.remark', 'Deliver before noon.')
            ->assertJsonPath('data.sale_type', 'credit')
            ->assertJsonPath('data.total_amount', '186000.00')
            ->assertJsonPath('data.balance_amount', '90000.00');

        $invoice->refresh();

        $this->assertSame('Deliver before noon.', $invoice->remark);
        $this->assertSame('credit', $invoice->sale_type);
        $this->assertEquals(10000, (float) $invoice->cash_back_amount);
        $this->assertEquals(186000, (float) $invoice->total_amount);
        $this->assertEquals(90000, (float) $invoice->balance_amount);
        $this->assertEquals(90000, (float) CustomerBalance::where('customer_id', $invoice->customer_id)->where('company_id', $invoice->company_id)->value('balance_amount'));

        $this->withToken($this->officeToken)
            ->patchJson("/api/office/invoices/{$invoice->id}/print-details", [
                'cash_back_amount' => 196001,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cash_back_amount');
    }

    public function test_invoice_report_lists_all_filtered_invoices_ordered_by_date(): void
    {
        $company = Company::query()->firstOrFail();
        $customer = Customer::query()->firstOrFail();

        foreach (range(1, 30) as $index) {
            $invoiceDate = \Carbon\Carbon::create(2026, 1, 1)->addDays(30 - $index);

            Invoice::query()->create([
                'invoice_no' => sprintf('INV-REPORT-%02d', $index),
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'invoice_date' => $invoiceDate->toDateString(),
                'due_date' => $invoiceDate->copy()->addDays(30)->toDateString(),
                'status' => 'issued',
                'subtotal_amount' => 1000 + $index,
                'total_amount' => 1000 + $index,
                'paid_amount' => 100 + $index,
                'balance_amount' => 900,
                'remark' => "Report remark {$index}",
            ]);
        }
        Invoice::query()->create([
            'invoice_no' => 'INV-REPORT-PAID',
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'invoice_date' => '2026-01-15',
            'due_date' => '2026-02-15',
            'status' => 'paid',
            'subtotal_amount' => 2000,
            'total_amount' => 2000,
            'paid_amount' => 2000,
            'balance_amount' => 0,
            'remark' => 'Paid report row',
        ]);

        $response = $this->get('/office/invoices/report?' . http_build_query([
            'company_id' => $company->id,
            'date_from' => '2026-01-01',
            'date_to' => '2026-01-31',
            'search' => 'INV-REPORT',
            'status' => 'issued',
        ]))
            ->assertOk()
            ->assertSee('INV-REPORT-30')
            ->assertSee('INV-REPORT-01')
            ->assertSee($company->name)
            ->assertSee('Report remark 30')
            ->assertSee('Save PDF')
            ->assertSee('Print')
            ->assertSee('body.invoice-report-page *', false);

        $content = $response->getContent();

        $this->assertLessThan(
            strpos($content, 'INV-REPORT-01'),
            strpos($content, 'INV-REPORT-30')
        );

        $this->get('/office/invoices/report?' . http_build_query([
            'action_only' => '1',
            'date_from' => '2026-01-01',
            'date_to' => '2026-01-31',
            'search' => 'INV-REPORT',
        ]))
            ->assertOk()
            ->assertSee('INV-REPORT-PAID')
            ->assertSee('Paid report row');

        Invoice::query()->create([
            'invoice_no' => 'INV-REPORT-CURRENT-MONTH',
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'invoice_date' => now()->startOfMonth()->addDay()->toDateString(),
            'due_date' => now()->startOfMonth()->addDays(10)->toDateString(),
            'status' => 'issued',
            'subtotal_amount' => 3000,
            'total_amount' => 3000,
            'paid_amount' => 0,
            'balance_amount' => 3000,
            'remark' => 'Default current month row',
        ]);
        Invoice::query()->create([
            'invoice_no' => 'INV-REPORT-LAST-MONTH',
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'invoice_date' => now()->subMonthNoOverflow()->startOfMonth()->addDay()->toDateString(),
            'due_date' => now()->toDateString(),
            'status' => 'issued',
            'subtotal_amount' => 4000,
            'total_amount' => 4000,
            'paid_amount' => 0,
            'balance_amount' => 4000,
            'remark' => 'Last month row',
        ]);

        $this->get('/office/invoices/report?' . http_build_query([
            'search' => 'INV-REPORT',
        ]))
            ->assertOk()
            ->assertSee(now()->startOfMonth()->toDateString())
            ->assertSee(now()->endOfMonth()->toDateString())
            ->assertSee('INV-REPORT-CURRENT-MONTH')
            ->assertDontSee('INV-REPORT-LAST-MONTH');
    }

    public function test_blocked_customer_company_credit_prevents_sales_order_creation(): void
    {
        $customer = Customer::where('name', 'Aung Pharmacy')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();

        $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('customer_id');
    }

    public function test_sales_representative_can_submit_multiple_product_lines_for_assigned_company(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $box = Unit::where('abbreviation', 'Box')->firstOrFail();
        $carton = Unit::where('abbreviation', 'Ctn')->firstOrFail();
        $paracetamol = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $coughSyrup = Product::where('sku', 'ML-COUGH-100')->firstOrFail();
        $paracetamolBox = ProductUnit::where('product_id', $paracetamol->id)->where('unit_id', $box->id)->firstOrFail();
        $paymentDueDate = now()->addDays(10)->toDateString();

        $response = $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'requested_delivery_date' => now()->addDays(2)->toDateString(),
                'payment_due_date' => $paymentDueDate,
                'items' => [
                    ['product_id' => $paracetamol->id, 'unit_id' => $box->id, 'quantity' => 10, 'foc_unit_id' => $box->id, 'foc_quantity' => 1],
                    ['product_id' => $coughSyrup->id, 'unit_id' => $carton->id, 'quantity' => 2],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.foc_quantity', 1)
            ->assertJsonPath('data.items.0.foc_unit_id', $box->id)
            ->assertJsonPath('data.items.0.foc_base_unit_quantity', $paracetamolBox->conversion_factor_to_base)
            ->assertJsonCount(1, 'data.foc_items');

        $order = SalesOrder::where('order_no', $response->json('data.order_no'))->firstOrFail();

        $this->assertCount(2, $order->items);
        $this->assertEquals($paracetamolBox->conversion_factor_to_base, $order->items()->where('product_id', $paracetamol->id)->first()->foc_base_unit_quantity);
        $this->assertEquals('submitted', $order->status);
        $this->assertDatabaseHas('invoices', [
            'sales_order_id' => $order->id,
            'status' => 'issued',
            'paid_amount' => 0,
            'balance_amount' => $order->total_amount,
            'due_date' => $paymentDueDate,
        ]);
        $expectedCustomerBalance = Invoice::query()
            ->where('customer_id', $order->customer_id)
            ->where('company_id', $order->company_id)
            ->where('status', '!=', 'void')
            ->sum('total_amount')
            - Payment::query()
                ->where('customer_id', $order->customer_id)
                ->where('company_id', $order->company_id)
                ->sum('amount');
        $this->assertDatabaseHas('customer_balances', [
            'customer_id' => $order->customer_id,
            'company_id' => $order->company_id,
            'balance_amount' => $expectedCustomerBalance,
        ]);
    }

    public function test_sales_order_history_sorts_newest_date_time_first(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();

        $olderOrder = $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $newerOrder = $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $response = $this->withToken($this->salesToken)
            ->getJson('/api/sales/orders?per_page=2')
            ->assertOk();

        $this->assertSame($newerOrder['id'], $response->json('data.0.id'));
        $this->assertSame($olderOrder['id'], $response->json('data.1.id'));
    }

    public function test_sales_representative_can_delete_own_pending_order(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();

        $createdOrder = $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $invoiceId = Invoice::where('sales_order_id', $createdOrder['id'])->value('id');

        $this->withToken($this->salesToken)
            ->deleteJson("/api/sales/orders/{$createdOrder['id']}")
            ->assertNoContent();

        $this->assertSoftDeleted('sales_orders', ['id' => $createdOrder['id'], 'status' => 'cancelled']);
        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'status' => 'void',
            'paid_amount' => 0,
            'balance_amount' => 0,
        ]);

        $ordersResponse = $this->withToken($this->salesToken)
            ->getJson('/api/sales/orders?per_page=100')
            ->assertOk();

        $this->assertNotContains($createdOrder['id'], collect($ordersResponse->json('data'))->pluck('id')->all());
    }

    public function test_sales_representative_can_edit_own_pending_order(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();

        $createdOrder = $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'payment_due_date' => now()->addDays(10)->toDateString(),
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->withToken($this->salesToken)
            ->putJson("/api/sales/orders/{$createdOrder['id']}", [
                'customer_id' => $customer->id,
                'requested_delivery_date' => now()->addDays(3)->toDateString(),
                'payment_due_date' => now()->addDays(20)->toDateString(),
                'note' => 'Updated from sales app',
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 2],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.items.0.quantity', 2);

        $order = SalesOrder::with('invoices')->findOrFail($createdOrder['id']);
        $invoice = $order->invoices->first();

        $this->assertEquals(2, $order->items()->first()->quantity);
        $this->assertEquals('Updated from sales app', $order->note);
        $this->assertEquals(now()->addDays(20)->toDateString(), $invoice->due_date->toDateString());
        $this->assertEquals((float) $order->total_amount, (float) $invoice->total_amount);
        $this->assertEquals((float) $order->total_amount, (float) $invoice->balance_amount);
    }

    public function test_sales_representative_cannot_delete_non_pending_order(): void
    {
        $order = SalesOrder::where('order_no', 'SO-DEMO-1000')->firstOrFail();

        $this->withToken($this->salesToken)
            ->deleteJson("/api/sales/orders/{$order->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_sales_representative_cannot_edit_non_pending_order(): void
    {
        $order = SalesOrder::where('order_no', 'SO-DEMO-1000')->firstOrFail();
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();

        $this->withToken($this->salesToken)
            ->putJson("/api/sales/orders/{$order->id}", [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_foc_rules_are_announcements_and_manual_foc_is_recorded(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $box = Unit::where('abbreviation', 'Box')->firstOrFail();
        $boxProductUnit = ProductUnit::where('product_id', $product->id)->where('unit_id', $box->id)->firstOrFail();

        FocRule::updateOrCreate(
            ['company_id' => $company->id, 'product_id' => $product->id, 'rule_type' => 'quantity', 'minimum_quantity_base_units' => 3000],
            [
                'minimum_order_value' => null,
                'reward_quantity_base_units' => 400,
                'starts_at' => now()->startOfMonth()->toDateString(),
                'ends_at' => now()->endOfMonth()->toDateString(),
                'status' => 'active',
            ]
        );

        $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $box->id, 'quantity' => 40],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.foc_base_unit_quantity', 0)
            ->assertJsonCount(0, 'data.foc_items');

        $response = $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $box->id, 'quantity' => 40, 'foc_unit_id' => $box->id, 'foc_quantity' => 2],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.foc_quantity', 2)
            ->assertJsonPath('data.items.0.foc_base_unit_quantity', 2 * $boxProductUnit->conversion_factor_to_base)
            ->assertJsonCount(1, 'data.foc_items');

        $order = SalesOrder::findOrFail($response->json('data.id'));

        $this->assertEquals(2 * $boxProductUnit->conversion_factor_to_base, $order->focItems()->sum('reward_base_unit_quantity'));

        $stockResponse = $this->withToken($this->salesToken)
            ->getJson('/api/sales/stock/current?search=' . urlencode($product->sku))
            ->assertOk();
        $stockRow = collect($stockResponse->json('data'))->firstWhere('product_id', $product->id);

        $this->assertNotNull($stockRow);
        $this->assertNotEmpty($stockRow['product']['foc_rules']);

        $filteredStockResponse = $this->withToken($this->salesToken)
            ->getJson('/api/sales/stock/current?foc_active=1&search=' . urlencode($product->sku))
            ->assertOk();

        $this->assertNotNull(collect($filteredStockResponse->json('data'))->firstWhere('product_id', $product->id));
    }

    public function test_office_can_approve_order_and_generate_invoice(): void
    {
        $order = SalesOrder::where('order_no', 'SO-DEMO-1001')->firstOrFail();
        $orderItem = $order->items()->firstOrFail();
        $warehouseId = StockBatch::where('company_id', $order->company_id)
            ->where('product_id', $orderItem->product_id)
            ->where('available_base_quantity', '>', 0)
            ->value('warehouse_id');

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$order->id}/approve", [
                'warehouse_id' => $warehouseId,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$order->id}/generate-invoice")
            ->assertOk()
            ->assertJsonPath('data.sales_order_id', $order->id);

        $this->assertDatabaseHas('invoices', [
            'sales_order_id' => $order->id,
            'balance_amount' => 98000,
        ]);
        $this->assertDatabaseHas('customer_balances', [
            'customer_id' => $order->customer_id,
            'company_id' => $order->company_id,
            'balance_amount' => 198000,
        ]);
        $this->assertDatabaseHas('customer_company_credit_statuses', [
            'customer_id' => $order->customer_id,
            'company_id' => $order->company_id,
            'outstanding_balance' => 198000,
        ]);

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$order->id}/generate-invoice")
            ->assertOk()
            ->assertJsonPath('data.sales_order_id', $order->id);

        $this->assertEquals(1, Invoice::where('sales_order_id', $order->id)->count());
    }

    public function test_invoice_generation_can_include_optional_tax_amount(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();
        $warehouseId = StockBatch::query()
            ->where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('available_base_quantity', '>', 0)
            ->value('warehouse_id');
        $taxAmount = 2500;

        $createdOrder = $this->withToken($this->officeToken)
            ->postJson('/api/office/orders', [
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouseId,
                'auto_approve' => true,
                'tax_amount' => $taxAmount,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $invoice = $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$createdOrder['id']}/generate-invoice")
            ->assertOk()
            ->json('data');

        $this->assertEquals($taxAmount, (float) $invoice['tax_amount']);
        $this->assertEquals((float) $createdOrder['total_amount'], (float) $invoice['total_amount']);
        $this->assertEquals((float) $invoice['total_amount'], (float) $invoice['balance_amount']);
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice['id'],
            'tax_amount' => $taxAmount,
            'total_amount' => (float) $createdOrder['total_amount'],
        ]);
    }

    public function test_office_can_create_auto_approved_order_and_reserve_stock(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();
        $productUnit = ProductUnit::where('product_id', $product->id)->where('unit_id', $unit->id)->firstOrFail();
        $warehouseId = StockBatch::query()
            ->where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->select('warehouse_id')
            ->groupBy('warehouse_id')
            ->havingRaw('SUM(available_base_quantity) >= ?', [1100])
            ->value('warehouse_id');
        $availableBefore = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('available_base_quantity');
        $reservedBefore = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('reserved_base_quantity');
        $soldBefore = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('sold_base_quantity');

        $response = $this->withToken($this->officeToken)
            ->postJson('/api/office/orders', [
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouseId,
                'payment_due_date' => now()->addDays(14)->toDateString(),
                'auto_approve' => true,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 10, 'foc_unit_id' => $unit->id, 'foc_quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.items.0.foc_base_unit_quantity', $productUnit->conversion_factor_to_base)
            ->assertJsonCount(1, 'data.foc_items');

        $order = SalesOrder::findOrFail($response->json('data.id'));
        $reservedQuantity = $order->items->sum(fn ($item) => $item->base_unit_quantity + $item->foc_base_unit_quantity);
        $availableAfter = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('available_base_quantity');
        $reservedAfterApproval = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('reserved_base_quantity');

        $this->assertEquals($availableBefore - $reservedQuantity, $availableAfter);
        $this->assertEquals($reservedBefore + $reservedQuantity, $reservedAfterApproval);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => SalesOrder::class,
            'reference_id' => $order->id,
            'movement_type' => 'reserve',
        ]);

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$order->id}/generate-invoice")
            ->assertOk()
            ->assertJsonPath('data.due_date', now()->addDays(14)->toDateString());

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$order->id}/deliver")
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');

        $reservedAfterDelivery = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('reserved_base_quantity');
        $soldAfterDelivery = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('sold_base_quantity');

        $this->assertEquals($reservedBefore, $reservedAfterDelivery);
        $this->assertEquals($soldBefore + $reservedQuantity, $soldAfterDelivery);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => SalesOrder::class,
            'reference_id' => $order->id,
            'movement_type' => 'sale',
        ]);
        $this->assertDatabaseHas('delivery_vouchers', [
            'sales_order_id' => $order->id,
            'status' => 'delivered',
        ]);
    }

    public function test_office_can_edit_invoiced_order_before_delivery_and_sync_stock_and_invoice(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();
        $warehouseId = StockBatch::query()
            ->where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->select('warehouse_id')
            ->groupBy('warehouse_id')
            ->havingRaw('SUM(available_base_quantity) >= ?', [1100])
            ->value('warehouse_id');
        $reservedBefore = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('reserved_base_quantity');

        $createdOrder = $this->withToken($this->officeToken)
            ->postJson('/api/office/orders', [
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouseId,
                'auto_approve' => true,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 10],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$createdOrder['id']}/generate-invoice")
            ->assertOk();

        $response = $this->withToken($this->officeToken)
            ->putJson("/api/office/orders/{$createdOrder['id']}", [
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouseId,
                'requested_delivery_date' => now()->addDay()->toDateString(),
                'payment_due_date' => now()->addDays(21)->toDateString(),
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 5],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'invoiced')
            ->json('data');

        $order = SalesOrder::with('items')->findOrFail($response['id']);
        $reservedQuantity = $order->items->sum(fn ($item) => $item->base_unit_quantity + $item->foc_base_unit_quantity);
        $reservedAfterEdit = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('reserved_base_quantity');
        $invoice = Invoice::where('sales_order_id', $order->id)->with('items')->firstOrFail();

        $this->assertEquals(5, $order->items->first()->quantity);
        $this->assertEquals($reservedBefore + $reservedQuantity, $reservedAfterEdit);
        $this->assertEquals((float) $order->total_amount, (float) $invoice->total_amount);
        $this->assertEquals((float) $order->total_amount, (float) $invoice->balance_amount);
        $this->assertEquals(now()->addDays(21)->toDateString(), $invoice->due_date->toDateString());
        $this->assertCount(1, $invoice->items);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => SalesOrder::class,
            'reference_id' => $order->id,
            'movement_type' => 'release',
        ]);
    }

    public function test_office_can_delete_order_before_delivery_and_release_stock(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();
        $warehouseId = StockBatch::query()
            ->where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('available_base_quantity', '>', 0)
            ->value('warehouse_id');
        $availableBefore = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('available_base_quantity');
        $reservedBefore = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('reserved_base_quantity');

        $createdOrder = $this->withToken($this->officeToken)
            ->postJson('/api/office/orders', [
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouseId,
                'auto_approve' => true,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->withToken($this->officeToken)
            ->deleteJson("/api/office/orders/{$createdOrder['id']}")
            ->assertNoContent();

        $availableAfter = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('available_base_quantity');
        $reservedAfter = StockBatch::where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('reserved_base_quantity');

        $this->assertEquals($availableBefore, $availableAfter);
        $this->assertEquals($reservedBefore, $reservedAfter);
        $this->assertSoftDeleted('sales_orders', ['id' => $createdOrder['id'], 'status' => 'cancelled']);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => SalesOrder::class,
            'reference_id' => $createdOrder['id'],
            'movement_type' => 'release',
        ]);
    }

    public function test_office_cannot_delete_order_with_invoice_payments(): void
    {
        $order = SalesOrder::where('order_no', 'SO-DEMO-1000')->firstOrFail();

        $this->withToken($this->officeToken)
            ->deleteJson("/api/office/orders/{$order->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('invoice');
    }

    public function test_cancelled_orders_are_excluded_from_sales_representative_detail_counts(): void
    {
        $salesRep = SalesRepresentative::where('employee_code', 'SR-0001')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $customer = Customer::where('code', 'CUS-0001')->firstOrFail();

        SalesOrder::query()->create([
            'order_no' => 'SO-CANCELLED-REPORT',
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'sales_representative_id' => $salesRep->id,
            'order_date' => now()->toDateString(),
            'requested_delivery_date' => now()->addDay()->toDateString(),
            'status' => 'cancelled',
            'subtotal_amount' => 500000,
            'discount_amount' => 0,
            'total_amount' => 500000,
        ]);

        $expectedActiveMonthlyOrders = SalesOrder::query()
            ->where('sales_representative_id', $salesRep->id)
            ->where('status', '!=', 'cancelled')
            ->whereYear('order_date', now()->year)
            ->whereMonth('order_date', now()->month)
            ->count();

        $response = $this->withToken($this->officeToken)
            ->getJson("/api/office/sales-representatives/{$salesRep->id}/detail")
            ->assertOk();

        $ordersMetric = collect($response->json('metrics'))->firstWhere('label', 'Orders');

        $this->assertSame((string) $expectedActiveMonthlyOrders, $ordersMetric['value']);
        $this->assertFalse(
            collect($response->json('salesHistoryRows'))->contains(fn (array $row) => $row['order'] === 'SO-CANCELLED-REPORT')
        );
    }

    public function test_cancelled_order_invoices_are_excluded_from_sales_representative_report(): void
    {
        $salesRep = SalesRepresentative::where('employee_code', 'SR-0001')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $customer = Customer::where('code', 'CUS-0001')->firstOrFail();

        $cancelledOrder = SalesOrder::query()->create([
            'order_no' => 'SO-CANCELLED-INVOICE-REPORT',
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'sales_representative_id' => $salesRep->id,
            'order_date' => now()->toDateString(),
            'requested_delivery_date' => now()->addDay()->toDateString(),
            'status' => 'cancelled',
            'subtotal_amount' => 500000,
            'discount_amount' => 0,
            'total_amount' => 500000,
        ]);

        Invoice::query()->create([
            'invoice_no' => 'INV-CANCELLED-REPORT',
            'sales_order_id' => $cancelledOrder->id,
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'sales_representative_id' => $salesRep->id,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'status' => 'issued',
            'subtotal_amount' => 500000,
            'discount_amount' => 0,
            'total_amount' => 500000,
            'paid_amount' => 0,
            'balance_amount' => 500000,
        ]);

        $expectedSales = Invoice::query()
            ->where('sales_representative_id', $salesRep->id)
            ->where('status', '!=', 'void')
            ->where(function ($query) {
                $query->whereNull('sales_order_id')
                    ->orWhereHas('salesOrder', fn ($orderQuery) => $orderQuery
                        ->withTrashed()
                        ->where('status', '!=', 'cancelled'));
            })
            ->whereYear('invoice_date', now()->year)
            ->whereMonth('invoice_date', now()->month)
            ->sum('total_amount');

        $response = $this->withToken($this->officeToken)
            ->getJson('/api/office/reports/sales/top-representatives?duration=month')
            ->assertOk();

        $repRow = collect($response->json('tableRows'))
            ->first(fn (array $row) => str_contains($row['representative'], $salesRep->employee_code));

        $this->assertNotNull($repRow);
        $this->assertSame(number_format((float) $expectedSales), $repRow['sales']);
    }

    public function test_office_can_post_pharmacy_return_against_delivered_order_and_update_finance_and_stock(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Box')->firstOrFail();
        $warehouseId = StockBatch::query()
            ->where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->select('warehouse_id')
            ->groupBy('warehouse_id')
            ->havingRaw('SUM(available_base_quantity) >= ?', [1100])
            ->value('warehouse_id');

        $createdOrder = $this->withToken($this->officeToken)
            ->postJson('/api/office/orders', [
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouseId,
                'auto_approve' => true,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 10],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$createdOrder['id']}/generate-invoice")
            ->assertOk();

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$createdOrder['id']}/deliver")
            ->assertOk();

        $invoice = Invoice::where('sales_order_id', $createdOrder['id'])->with('items')->firstOrFail();
        $invoiceItem = $invoice->items->first();
        $originalInvoiceTotal = (float) $invoice->total_amount;
        $returnQuantity = 2;
        $returnBaseQuantity = $returnQuantity * (int) $invoiceItem->conversion_factor_to_base;
        $expectedReturnAmount = round((float) $invoiceItem->line_total * ($returnBaseQuantity / (int) $invoiceItem->base_unit_quantity), 2);

        $response = $this->withToken($this->officeToken)
            ->postJson('/api/office/sales-returns', [
                'invoice_id' => $invoice->id,
                'warehouse_id' => $warehouseId,
                'return_date' => now()->toDateString(),
                'reason' => 'Pharmacy returned sellable stock',
                'items' => [
                    [
                        'invoice_item_id' => $invoiceItem->id,
                        'quantity' => $returnQuantity,
                        'condition' => 'sellable',
                        'batch_no' => 'RET-SELLABLE-001',
                        'expiry_date' => now()->addYear()->toDateString(),
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('status', 'posted')
            ->json();

        $invoice->refresh();
        $invoiceItem->refresh();
        $returnBatch = StockBatch::where('company_id', $company->id)
            ->where('warehouse_id', $warehouseId)
            ->where('product_id', $product->id)
            ->where('batch_no', 'RET-SELLABLE-001')
            ->firstOrFail();

        $this->assertEquals(8, $invoiceItem->quantity);
        $this->assertEquals($originalInvoiceTotal - $expectedReturnAmount, (float) $invoice->total_amount);
        $this->assertEquals($originalInvoiceTotal - $expectedReturnAmount, (float) $invoice->balance_amount);
        $this->assertEquals($returnBaseQuantity, $returnBatch->available_base_quantity);
        $this->assertEquals($expectedReturnAmount, (float) $response['total_amount']);
        $this->assertDatabaseHas('sales_return_items', [
            'sales_return_id' => $response['id'],
            'invoice_item_id' => $invoiceItem->id,
            'condition' => 'sellable',
            'base_unit_quantity' => $returnBaseQuantity,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => SalesReturn::class,
            'reference_id' => $response['id'],
            'warehouse_id' => $warehouseId,
            'stock_batch_id' => $returnBatch->id,
            'movement_type' => 'return',
            'base_unit_quantity' => $returnBaseQuantity,
        ]);
        $expectedCustomerBalance = Invoice::query()
            ->where('customer_id', $invoice->customer_id)
            ->where('company_id', $invoice->company_id)
            ->where('status', '!=', 'void')
            ->sum('total_amount')
            - Payment::query()
                ->where('customer_id', $invoice->customer_id)
                ->where('company_id', $invoice->company_id)
                ->sum('amount');
        $this->assertDatabaseHas('customer_balances', [
            'customer_id' => $invoice->customer_id,
            'company_id' => $invoice->company_id,
            'balance_amount' => $expectedCustomerBalance,
        ]);

        $financeMetrics = collect($this->withToken($this->officeToken)
            ->getJson('/api/office/reports/finance/overview?' . http_build_query([
                'duration' => 'month',
                'date_from' => now()->toDateString(),
                'date_to' => now()->toDateString(),
                'company_id' => $company->id,
            ]))
            ->assertOk()
            ->json('metrics'));
        $salesReturnsMetric = $financeMetrics->firstWhere('label', 'Sales returns');

        $this->assertNotNull($salesReturnsMetric);
        $this->assertEquals(number_format($expectedReturnAmount), $salesReturnsMetric['value']);
    }

    public function test_office_can_transfer_stock_between_warehouses_preserving_batch_and_expiry(): void
    {
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $secondProduct = Product::where('sku', 'ML-COUGH-100')->firstOrFail();
        $sourceWarehouse = Warehouse::where('code', 'MAIN')->firstOrFail();
        $destinationWarehouse = Warehouse::where('code', 'YGN-HUB')->firstOrFail();
        $sourceBatch = StockBatch::where('company_id', $company->id)
            ->where('warehouse_id', $sourceWarehouse->id)
            ->where('product_id', $product->id)
            ->where('available_base_quantity', '>', 0)
            ->orderByRaw('expiry_date is null')
            ->orderBy('expiry_date')
            ->firstOrFail();
        $secondSourceBatch = StockBatch::where('company_id', $company->id)
            ->where('warehouse_id', $sourceWarehouse->id)
            ->where('product_id', $secondProduct->id)
            ->where('available_base_quantity', '>', 0)
            ->orderByRaw('expiry_date is null')
            ->orderBy('expiry_date')
            ->firstOrFail();
        $sourceAvailableBefore = (int) $sourceBatch->available_base_quantity;
        $secondSourceAvailableBefore = (int) $secondSourceBatch->available_base_quantity;
        $destinationAvailableBefore = StockBatch::where('company_id', $company->id)
            ->where('warehouse_id', $destinationWarehouse->id)
            ->where('product_id', $product->id)
            ->where('batch_no', $sourceBatch->batch_no)
            ->where('expiry_date', $sourceBatch->expiry_date)
            ->sum('available_base_quantity');
        $secondDestinationAvailableBefore = StockBatch::where('company_id', $company->id)
            ->where('warehouse_id', $destinationWarehouse->id)
            ->where('product_id', $secondProduct->id)
            ->where('batch_no', $secondSourceBatch->batch_no)
            ->where('expiry_date', $secondSourceBatch->expiry_date)
            ->sum('available_base_quantity');

        $this->withToken($this->officeToken)
            ->postJson('/api/office/stock/transfers', [
                'company_id' => $company->id,
                'source_warehouse_id' => $sourceWarehouse->id,
                'destination_warehouse_id' => $destinationWarehouse->id,
                'items' => [
                    ['stock_batch_id' => $sourceBatch->id, 'base_unit_quantity' => 500],
                    ['stock_batch_id' => $secondSourceBatch->id, 'base_unit_quantity' => 12],
                ],
                'note' => 'Move stock for Yangon dispatch',
            ])
            ->assertCreated()
            ->assertJsonPath('source_warehouse.id', $sourceWarehouse->id)
            ->assertJsonPath('destination_warehouse.id', $destinationWarehouse->id);

        $transfer = StockTransfer::latest('id')->firstOrFail();
        $sourceBatch->refresh();
        $secondSourceBatch->refresh();
        $destinationBatch = StockBatch::where('company_id', $company->id)
            ->where('warehouse_id', $destinationWarehouse->id)
            ->where('product_id', $product->id)
            ->where('batch_no', $sourceBatch->batch_no)
            ->where('expiry_date', $sourceBatch->expiry_date)
            ->firstOrFail();
        $secondDestinationBatch = StockBatch::where('company_id', $company->id)
            ->where('warehouse_id', $destinationWarehouse->id)
            ->where('product_id', $secondProduct->id)
            ->where('batch_no', $secondSourceBatch->batch_no)
            ->where('expiry_date', $secondSourceBatch->expiry_date)
            ->firstOrFail();

        $this->assertEquals($sourceAvailableBefore - 500, $sourceBatch->available_base_quantity);
        $this->assertEquals($destinationAvailableBefore + 500, $destinationBatch->available_base_quantity);
        $this->assertEquals($secondSourceAvailableBefore - 12, $secondSourceBatch->available_base_quantity);
        $this->assertEquals($secondDestinationAvailableBefore + 12, $secondDestinationBatch->available_base_quantity);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => StockTransfer::class,
            'reference_id' => $transfer->id,
            'warehouse_id' => $sourceWarehouse->id,
            'stock_batch_id' => $sourceBatch->id,
            'movement_type' => 'transfer',
            'base_unit_quantity' => -500,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => StockTransfer::class,
            'reference_id' => $transfer->id,
            'warehouse_id' => $destinationWarehouse->id,
            'stock_batch_id' => $destinationBatch->id,
            'movement_type' => 'transfer',
            'base_unit_quantity' => 500,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => StockTransfer::class,
            'reference_id' => $transfer->id,
            'warehouse_id' => $sourceWarehouse->id,
            'stock_batch_id' => $secondSourceBatch->id,
            'movement_type' => 'transfer',
            'base_unit_quantity' => -12,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'reference_type' => StockTransfer::class,
            'reference_id' => $transfer->id,
            'warehouse_id' => $destinationWarehouse->id,
            'stock_batch_id' => $secondDestinationBatch->id,
            'movement_type' => 'transfer',
            'base_unit_quantity' => 12,
        ]);
    }

    public function test_inventory_summary_includes_stock_holding_value(): void
    {
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();

        $response = $this->withToken($this->officeToken)
            ->getJson("/api/office/stock/current?company_id={$company->id}&per_page=15")
            ->assertOk();

        $this->assertArrayHasKey('stock_value_amount', $response->json('summary'));
        $this->assertGreaterThan(0, $response->json('summary.stock_value_amount'));
        $this->assertArrayHasKey('stock_value_amount', $response->json('data.0'));
    }

    public function test_inventory_shows_soft_deleted_products_while_available_stock_remains(): void
    {
        $batch = StockBatch::query()
            ->where('available_base_quantity', '>', 0)
            ->firstOrFail();
        $product = Product::findOrFail($batch->product_id);

        $product->delete();

        $this->withToken($this->officeToken)
            ->getJson('/api/office/stock/current?' . http_build_query([
                'company_id' => $batch->company_id,
                'search' => $product->sku,
                'per_page' => 15,
            ]))
            ->assertOk()
            ->assertJsonPath('data.0.product.id', $product->id)
            ->assertJsonPath('data.0.product.name', $product->name);

        $this->withToken($this->officeToken)
            ->getJson("/api/office/stock/products/{$product->id}/batches?per_page=15")
            ->assertOk()
            ->assertJsonPath('product.id', $product->id)
            ->assertJsonPath('data.0.product.id', $product->id);

        StockBatch::query()
            ->where('product_id', $product->id)
            ->update(['available_base_quantity' => 0]);

        $this->withToken($this->officeToken)
            ->getJson('/api/office/stock/current?' . http_build_query([
                'company_id' => $batch->company_id,
                'search' => $product->sku,
                'per_page' => 15,
            ]))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_inventory_report_exports_all_matching_rows_with_nearest_expiry(): void
    {
        $company = Company::query()->firstOrFail();
        $warehouse = Warehouse::query()->firstOrFail();
        $unit = Unit::query()->firstOrCreate(
            ['abbreviation' => 'RptBottle'],
            ['name' => 'Report Bottle', 'status' => 'active']
        );
        $boxUnit = Unit::query()->firstOrCreate(
            ['abbreviation' => 'RptBox'],
            ['name' => 'Report Box', 'status' => 'active']
        );
        $product = Product::query()->create([
            'company_id' => $company->id,
            'base_unit_id' => $unit->id,
            'sku' => 'INV-REPORT-STOCK',
            'name' => 'Inventory Report Stock',
            'low_stock_threshold_base_units' => 0,
            'status' => 'active',
        ]);
        ProductUnit::query()->create([
            'product_id' => $product->id,
            'unit_id' => $unit->id,
            'conversion_factor_to_base' => 1,
            'is_base_unit' => true,
            'is_default_sales_unit' => false,
            'status' => 'active',
        ]);
        ProductUnit::query()->create([
            'product_id' => $product->id,
            'unit_id' => $boxUnit->id,
            'conversion_factor_to_base' => 12,
            'is_base_unit' => false,
            'is_default_sales_unit' => true,
            'status' => 'active',
        ]);

        StockBatch::query()->create([
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'batch_no' => 'REPORT-FAR',
            'expiry_date' => '2026-09-15',
            'received_base_quantity' => 12,
            'available_base_quantity' => 12,
        ]);
        StockBatch::query()->create([
            'company_id' => $company->id,
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'batch_no' => 'REPORT-NEAR',
            'expiry_date' => '2026-03-01',
            'received_base_quantity' => 6,
            'available_base_quantity' => 6,
        ]);

        $this->get('/office/inventory/report?' . http_build_query([
            'action_only' => '1',
            'company_id' => $company->id,
            'search' => 'INV-REPORT-STOCK',
        ]))
            ->assertOk()
            ->assertSee('No.')
            ->assertSee('Company')
            ->assertSee('Product name')
            ->assertSee('Qty')
            ->assertSee('Expire')
            ->assertSee('Stock value')
            ->assertSee($company->name)
            ->assertSee('Inventory Report Stock')
            ->assertSee('1 RptBox, 6 RptBottle')
            ->assertSee('01-Mar-2026')
            ->assertDontSee('15-Sep-2026');
    }

    public function test_finance_report_date_range_includes_stock_holding_value(): void
    {
        $dateFrom = now()->startOfMonth()->toDateString();
        $dateTo = now()->endOfMonth()->toDateString();

        $response = $this->withToken($this->officeToken)
            ->getJson("/api/office/reports/finance/overview?duration=month&date_from={$dateFrom}&date_to={$dateTo}")
            ->assertOk();
        $metrics = collect($response->json('metrics'));
        $duration = collect($response->json('summary'))->firstWhere('label', 'Duration');

        $this->assertTrue($metrics->contains('label', 'Stock holding value'));
        $this->assertSame("{$dateFrom} to {$dateTo}", $duration['note']);
    }

    public function test_payment_allocation_updates_invoice_balance(): void
    {
        $invoice = Invoice::with('items')->where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

        $createdPayment = $this->withToken($this->officeToken)
            ->postJson('/api/office/payments', [
                'company_id' => $invoice->company_id,
                'customer_id' => $invoice->customer_id,
                'amount' => 100000,
                'payment_method' => 'cash',
                'allocations' => [
                    ['invoice_id' => $invoice->id, 'allocated_amount' => 100000],
                ],
            ])
            ->assertCreated()
            ->json('data');

        $invoice->refresh();

        $this->assertEquals(196000, (float) $invoice->paid_amount);
        $this->assertEquals(0, (float) $invoice->balance_amount);
        $this->assertEquals('paid', $invoice->status);
        $this->assertEquals(0, (float) CustomerBalance::where('customer_id', $invoice->customer_id)->where('company_id', $invoice->company_id)->value('balance_amount'));
        $this->assertEquals(0, (float) CustomerCompanyCreditStatus::where('customer_id', $invoice->customer_id)->where('company_id', $invoice->company_id)->value('outstanding_balance'));

        $paymentRow = collect($this->withToken($this->officeToken)
            ->getJson('/api/office/payments?per_page=25')
            ->assertOk()
            ->json('data'))->firstWhere('id', $createdPayment['id']);

        $this->assertNotNull($paymentRow);
        $this->assertEquals($invoice->id, $paymentRow['allocations'][0]['invoice']['id']);

        $invoiceItem = $invoice->items->first();
        $warehouseId = StockBatch::query()
            ->where('company_id', $invoice->company_id)
            ->where('product_id', $invoiceItem->product_id)
            ->where('available_base_quantity', '>', 0)
            ->value('warehouse_id');
        $returnBaseQuantity = (int) $invoiceItem->conversion_factor_to_base;
        $expectedReturnAmount = round((float) $invoiceItem->line_total * ($returnBaseQuantity / (int) $invoiceItem->base_unit_quantity), 2);

        $salesReturn = $this->withToken($this->officeToken)
            ->postJson('/api/office/sales-returns', [
                'invoice_id' => $invoice->id,
                'warehouse_id' => $warehouseId,
                'return_date' => now()->toDateString(),
                'reason' => 'Paid invoice return creates customer credit',
                'items' => [
                    [
                        'invoice_item_id' => $invoiceItem->id,
                        'quantity' => 1,
                        'condition' => 'sellable',
                        'batch_no' => 'RET-CREDIT-001',
                    ],
                ],
            ])
            ->assertCreated()
            ->json();

        $receivableSummary = $this->withToken($this->officeToken)
            ->getJson('/api/office/receivables?' . http_build_query([
                'action_only' => 0,
                'company_id' => $invoice->company_id,
                'customer_id' => $invoice->customer_id,
            ]))
            ->assertOk()
            ->json('summary');

        $this->assertEquals($expectedReturnAmount, (float) $receivableSummary['customer_credit_amount']);
        $this->assertEquals(-$expectedReturnAmount, (float) CustomerBalance::where('customer_id', $invoice->customer_id)->where('company_id', $invoice->company_id)->value('balance_amount'));

        $returnHistory = $this->withToken($this->officeToken)
            ->getJson('/api/office/sales-returns?' . http_build_query([
                'search' => $salesReturn['return_no'],
                'company_id' => $invoice->company_id,
                'date_from' => now()->toDateString(),
                'date_to' => now()->toDateString(),
            ]))
            ->assertOk();
        $returnRow = collect($returnHistory->json('data'))->firstWhere('id', $salesReturn['id']);

        $this->assertNotNull($returnRow);
        $this->assertEquals($expectedReturnAmount, (float) $returnRow['total_amount']);
        $this->assertEquals(196000, (float) $returnRow['payment_amount']);
        $this->assertEquals(196000, (float) $returnHistory->json('summary.payment_amount'));
    }

    public function test_customer_payment_must_match_invoice_allocations(): void
    {
        $invoice = Invoice::where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

        $this->withToken($this->officeToken)
            ->postJson('/api/office/payments', [
                'company_id' => $invoice->company_id,
                'customer_id' => $invoice->customer_id,
                'amount' => 100000,
                'payment_method' => 'cash',
                'allocations' => [
                    ['invoice_id' => $invoice->id, 'allocated_amount' => 50000],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('allocations');
    }

    public function test_invoice_detail_includes_multiple_payment_records(): void
    {
        $invoice = Invoice::where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

        foreach ([40000, 60000] as $amount) {
            $this->withToken($this->officeToken)
                ->postJson('/api/office/payments', [
                    'company_id' => $invoice->company_id,
                    'customer_id' => $invoice->customer_id,
                    'amount' => $amount,
                    'payment_method' => 'cash',
                    'allocations' => [
                        ['invoice_id' => $invoice->id, 'allocated_amount' => $amount],
                    ],
                ])
                ->assertCreated();
        }

        $response = $this->withToken($this->officeToken)
            ->getJson('/api/office/invoices?per_page=25')
            ->assertOk();

        $invoiceRow = collect($response->json('data'))->firstWhere('id', $invoice->id);

        $this->assertNotNull($invoiceRow);
        $this->assertCount(3, $invoiceRow['allocations']);
        $this->assertEquals(196000, collect($invoiceRow['allocations'])->sum('allocated_amount'));
    }

    public function test_office_can_filter_invoices_by_search_status_company_and_invoice_date_range(): void
    {
        $invoice = Invoice::where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

        $response = $this->withToken($this->officeToken)
            ->getJson('/api/office/invoices?' . http_build_query([
                'action_only' => 0,
                'company_id' => $invoice->company_id,
                'date_from' => $invoice->invoice_date->toDateString(),
                'date_to' => $invoice->invoice_date->toDateString(),
                'search' => $invoice->invoice_no,
                'status' => $invoice->status,
            ]))
            ->assertOk();

        $this->assertTrue(collect($response->json('data'))->contains('id', $invoice->id));

        $this->withToken($this->officeToken)
            ->getJson('/api/office/invoices?' . http_build_query([
                'action_only' => 0,
                'date_from' => $invoice->invoice_date->copy()->addDay()->toDateString(),
                'date_to' => $invoice->invoice_date->copy()->addDays(2)->toDateString(),
                'search' => $invoice->invoice_no,
            ]))
            ->assertOk()
            ->assertJsonMissing(['id' => $invoice->id]);
    }

    public function test_pharmacy_detail_uses_live_order_invoice_and_payment_history(): void
    {
        $invoice = Invoice::where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

        $response = $this->withToken($this->officeToken)
            ->getJson("/api/office/customers/{$invoice->customer_id}/detail")
            ->assertOk();

        $this->assertEquals($invoice->customer_id, $response->json('customer.id'));
        $this->assertNotEmpty($response->json('orders'));
        $this->assertNotEmpty($response->json('invoices'));
        $this->assertNotEmpty($response->json('payments'));
        $this->assertTrue(collect($response->json('invoices'))->contains('id', $invoice->id));
    }

    public function test_company_payable_payment_updates_receiving_payment_status(): void
    {
        $payable = CompanyPayable::query()
            ->where('balance_amount', '>', 0)
            ->with('stockReceipt')
            ->firstOrFail();
        $receipt = $payable->stockReceipt;
        $amount = min(100000, (float) $payable->balance_amount);

        $this->withToken($this->officeToken)
            ->postJson('/api/office/company-payments', [
                'company_id' => $payable->company_id,
                'company_payable_id' => $payable->id,
                'amount' => $amount,
                'payment_method' => 'cash',
            ])
            ->assertCreated();

        $payable->refresh();
        $receipt->refresh();

        $this->assertEquals((float) $payable->paid_amount, (float) $receipt->paid_amount);
        $this->assertEquals((float) $payable->balance_amount, (float) $receipt->due_amount);
        $this->assertEquals((float) $payable->balance_amount <= 0 ? 'paid' : 'partial', $receipt->payment_status);

        $payableRow = collect($this->withToken($this->officeToken)
            ->getJson('/api/office/payables?per_page=15')
            ->assertOk()
            ->json('data'))->firstWhere('id', $payable->id);

        $this->assertNotNull($payableRow);
        $this->assertNotEmpty($payableRow['payments']);
        $this->assertEquals($payable->id, $payableRow['payments'][0]['company_payable_id']);
    }

    public function test_office_can_create_update_and_delete_company(): void
    {
        $created = $this->withToken($this->officeToken)
            ->postJson('/api/office/companies', [
                'name' => 'North Star Pharma',
                'code' => 'NORTHSTAR',
                'contact_person' => 'Daw Khin',
                'phone' => '09-777-000001',
                'status' => 'active',
            ])
            ->assertCreated()
            ->json();

        $this->withToken($this->officeToken)
            ->putJson("/api/office/companies/{$created['id']}", [
                'name' => 'North Star Pharma Distribution',
                'code' => 'NORTHSTAR',
                'contact_person' => 'Daw Khin',
                'phone' => '09-777-000001',
                'status' => 'inactive',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'inactive');

        $this->withToken($this->officeToken)
            ->deleteJson("/api/office/companies/{$created['id']}")
            ->assertNoContent();

        $this->assertSoftDeleted('companies', [
            'id' => $created['id'],
            'code' => 'NORTHSTAR',
        ]);
    }

    public function test_office_can_view_and_clear_activity_logs(): void
    {
        AuditLog::query()->delete();

        $created = $this->withToken($this->officeToken)
            ->postJson('/api/office/companies', [
                'name' => 'Activity Test Pharma',
                'code' => 'ACTIVITYTEST',
                'contact_person' => 'Daw Activity',
                'phone' => '09-777-000010',
                'status' => 'active',
            ])
            ->assertCreated()
            ->json();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'created',
            'auditable_type' => Company::class,
            'auditable_id' => $created['id'],
        ]);

        $this->withToken($this->officeToken)
            ->getJson('/api/office/activity-logs?per_page=25')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'created')
            ->assertJsonPath('data.0.auditable_label', 'Company');

        $this->withToken($this->officeToken)
            ->deleteJson('/api/office/activity-logs')
            ->assertOk()
            ->assertJsonPath('message', 'Activity logs cleared.');

        $this->assertSame(0, AuditLog::count());
    }

    public function test_office_can_create_update_and_delete_product(): void
    {
        Storage::fake('public');

        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $category = ProductCategory::where('code', 'PAIN')->firstOrFail();
        $unit = Unit::where('abbreviation', 'Tab')->firstOrFail();
        $box = Unit::where('abbreviation', 'Box')->firstOrFail();

        $created = $this->withToken($this->officeToken)
            ->post('/api/office/products', [
                'company_id' => $company->id,
                'product_category_id' => $category->id,
                'base_unit_id' => $unit->id,
                'sku' => 'TEST-PROD-001',
                'barcode' => '9559000000012',
                'brand' => 'Test Health',
                'name' => 'Test Product 001',
                'primary_image' => $this->fakePngUpload(),
                'default_discount_percentage' => 4,
                'commission_rate_percentage' => 2,
                'low_stock_threshold_sales_units' => 20,
                'base_unit_selling_price' => 1500,
                'product_units' => [
                    ['unit_id' => $unit->id, 'conversion_factor_to_base' => 1, 'selling_price' => 1500, 'is_default_sales_unit' => false, 'status' => 'active'],
                    ['unit_id' => $box->id, 'conversion_factor_to_base' => 100, 'selling_price' => 140000, 'is_default_sales_unit' => true, 'status' => 'active'],
                ],
                'status' => 'active',
            ])
            ->assertCreated()
            ->assertJsonPath('brand', 'Test Health')
            ->assertJsonPath('barcode', '9559000000012')
            ->json();

        Storage::disk('public')->assertExists($created['primary_image_path']);

        $this->withToken($this->officeToken)
            ->putJson("/api/office/products/{$created['id']}", [
                'company_id' => $company->id,
                'product_category_id' => $category->id,
                'base_unit_id' => $unit->id,
                'sku' => 'TEST-PROD-001',
                'barcode' => '9559000000013',
                'brand' => 'Test Health Plus',
                'name' => 'Test Product 001 Updated',
                'default_discount_percentage' => 5,
                'commission_rate_percentage' => 3,
                'low_stock_threshold_sales_units' => 25,
                'base_unit_selling_price' => 1800,
                'product_units' => [
                    ['unit_id' => $unit->id, 'conversion_factor_to_base' => 1, 'selling_price' => 1800, 'is_default_sales_unit' => false, 'status' => 'active'],
                    ['unit_id' => $box->id, 'conversion_factor_to_base' => 100, 'selling_price' => 150000, 'is_default_sales_unit' => true, 'status' => 'active'],
                ],
                'status' => 'inactive',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'inactive')
            ->assertJsonPath('brand', 'Test Health Plus')
            ->assertJsonPath('barcode', '9559000000013')
            ->assertJsonPath('name', 'Test Product 001 Updated');

        $this->assertDatabaseHas('products', [
            'id' => $created['id'],
            'low_stock_threshold_base_units' => 2500,
        ]);

        $this->assertDatabaseHas('product_units', [
            'product_id' => $created['id'],
            'unit_id' => $unit->id,
            'is_base_unit' => 1,
            'selling_price' => 1800,
        ]);

        $this->assertDatabaseHas('product_units', [
            'product_id' => $created['id'],
            'unit_id' => $box->id,
            'conversion_factor_to_base' => 100,
            'is_default_sales_unit' => 1,
            'selling_price' => 150000,
        ]);

        $this->withToken($this->officeToken)
            ->deleteJson("/api/office/products/{$created['id']}")
            ->assertNoContent();

        $this->assertSoftDeleted('products', [
            'id' => $created['id'],
            'sku' => 'TEST-PROD-001',
        ]);
    }

    public function test_office_can_filter_and_restore_deleted_products(): void
    {
        $product = Product::query()->firstOrFail();

        $this->withToken($this->officeToken)
            ->deleteJson("/api/office/products/{$product->id}")
            ->assertNoContent();

        $this->withToken($this->officeToken)
            ->getJson('/api/office/products?' . http_build_query([
                'search' => $product->sku,
                'per_page' => 15,
            ]))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withToken($this->officeToken)
            ->getJson('/api/office/products?' . http_build_query([
                'search' => $product->sku,
                'status' => 'deleted',
                'per_page' => 15,
            ]))
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id)
            ->assertJsonPath('data.0.name', $product->name);

        $this->withToken($this->officeToken)
            ->getJson("/api/office/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('id', $product->id);

        $this->withToken($this->officeToken)
            ->postJson("/api/office/products/{$product->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $product->id);

        $this->assertNull(Product::withTrashed()->findOrFail($product->id)->deleted_at);

        $this->withToken($this->officeToken)
            ->getJson('/api/office/products?' . http_build_query([
                'search' => $product->sku,
                'per_page' => 15,
            ]))
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id);
    }

    private function fakePngUpload(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'product-image');
        file_put_contents($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='));

        return new UploadedFile($path, 'test-product.png', 'image/png', null, true);
    }
}
