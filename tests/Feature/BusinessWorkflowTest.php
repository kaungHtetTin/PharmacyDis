<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\SalesOrder;
use App\Models\Unit;
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
            ->assertCreated();

        $order = SalesOrder::where('order_no', $response->json('data.order_no'))->firstOrFail();

        $this->assertCount(2, $order->items);
        $this->assertEquals(100, $order->items()->where('product_id', $paracetamol->id)->first()->foc_base_unit_quantity);
        $this->assertEquals('submitted', $order->status);
    }

    public function test_office_can_approve_order_and_generate_invoice(): void
    {
        $order = SalesOrder::where('order_no', 'SO-DEMO-1001')->firstOrFail();

        $this->withToken($this->officeToken)
            ->postJson("/api/office/orders/{$order->id}/approve")
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
    }

    public function test_payment_allocation_updates_invoice_balance(): void
    {
        $invoice = Invoice::where('invoice_no', 'INV-DEMO-1000')->firstOrFail();

        $this->withToken($this->officeToken)
            ->postJson('/api/office/payments', [
                'company_id' => $invoice->company_id,
                'customer_id' => $invoice->customer_id,
                'amount' => 100000,
                'payment_method' => 'cash',
                'allocations' => [
                    ['invoice_id' => $invoice->id, 'allocated_amount' => 100000],
                ],
            ])
            ->assertCreated();

        $invoice->refresh();

        $this->assertEquals(196000, (float) $invoice->paid_amount);
        $this->assertEquals(0, (float) $invoice->balance_amount);
        $this->assertEquals('paid', $invoice->status);
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
