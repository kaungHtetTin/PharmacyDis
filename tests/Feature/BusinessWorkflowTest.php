<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Company;
use App\Models\CompanyPayable;
use App\Models\CustomerBalance;
use App\Models\CustomerCompanyCreditStatus;
use App\Models\FocRule;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\SalesOrder;
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
            'email' => 'mayzin@paramacy.test',
            'password' => 'password',
            'user_type' => 'sales',
        ])->json('token');

        $this->officeToken = $this->postJson('/api/auth/login', [
            'email' => 'admin@paramacy.test',
            'password' => 'password',
            'user_type' => 'office',
        ])->json('token');
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

        $response = $this->withToken($this->salesToken)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'requested_delivery_date' => now()->addDays(2)->toDateString(),
                'items' => [
                    ['product_id' => $paracetamol->id, 'unit_id' => $box->id, 'quantity' => 10],
                    ['product_id' => $coughSyrup->id, 'unit_id' => $carton->id, 'quantity' => 2],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.foc_base_unit_quantity', 100)
            ->assertJsonCount(1, 'data.foc_items');

        $order = SalesOrder::where('order_no', $response->json('data.order_no'))->firstOrFail();

        $this->assertCount(2, $order->items);
        $this->assertEquals(100, $order->items()->where('product_id', $paracetamol->id)->first()->foc_base_unit_quantity);
        $this->assertEquals('submitted', $order->status);
    }

    public function test_quantity_foc_rules_apply_higher_tiers_then_lower_remainders(): void
    {
        $customer = Customer::where('name', 'Shwe Clinic Store')->firstOrFail();
        $company = Company::where('code', 'MEDILIFE')->firstOrFail();
        $product = Product::where('sku', 'ML-PARA-500')->firstOrFail();
        $box = Unit::where('abbreviation', 'Box')->firstOrFail();

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

        foreach ([20 => 200, 40 => 500, 50 => 600, 60 => 800] as $boxQuantity => $expectedFocBaseQuantity) {
            $response = $this->withToken($this->salesToken)
                ->postJson('/api/sales/orders', [
                    'customer_id' => $customer->id,
                    'items' => [
                        ['product_id' => $product->id, 'unit_id' => $box->id, 'quantity' => $boxQuantity],
                    ],
                ])
                ->assertCreated()
                ->assertJsonPath('data.items.0.foc_base_unit_quantity', $expectedFocBaseQuantity);

            $order = SalesOrder::findOrFail($response->json('data.id'));

            $this->assertEquals($expectedFocBaseQuantity, $order->focItems()->sum('reward_base_unit_quantity'));
        }
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

    public function test_office_can_create_auto_approved_order_and_reserve_stock(): void
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
                'auto_approve' => true,
                'items' => [
                    ['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 10],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.items.0.foc_base_unit_quantity', 100)
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
            ->assertOk();

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

    public function test_payment_allocation_updates_invoice_balance(): void
    {
        $invoice = Invoice::where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

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
                'low_stock_threshold_base_units' => 20,
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
                'low_stock_threshold_base_units' => 25,
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

    private function fakePngUpload(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'product-image');
        file_put_contents($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='));

        return new UploadedFile($path, 'test-product.png', 'image/png', null, true);
    }
}
