<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerBalance;
use App\Models\CustomerCompanyCreditStatus;
use App\Models\FocRule;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\Role;
use App\Models\SalesOrder;
use App\Models\SalesOrderFocItem;
use App\Models\SalesOrderItem;
use App\Models\SalesRepresentative;
use App\Models\Setting;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolesAndSampleDataSeeder extends Seeder
{
    public function run()
    {
        $adminRole = Role::updateOrCreate(
            ['name' => 'admin'],
            ['display_name' => 'Admin', 'description' => 'Office administrator']
        );

        $salesRole = Role::updateOrCreate(
            ['name' => 'sales_representative'],
            ['display_name' => 'Sales Representative', 'description' => 'Mobile sales app user']
        );

        $adminUser = User::updateOrCreate(
            ['email' => 'admin@paramacy.test'],
            [
                'role_id' => $adminRole->id,
                'name' => 'Admin User',
                'phone' => '09-400-000001',
                'user_type' => 'office',
                'status' => 'active',
                'password' => Hash::make('password'),
            ]
        );

        $salesUser = User::updateOrCreate(
            ['email' => 'mayzin@paramacy.test'],
            [
                'role_id' => $salesRole->id,
                'name' => 'May Zin',
                'phone' => '09-400-000002',
                'user_type' => 'sales',
                'status' => 'active',
                'password' => Hash::make('password'),
            ]
        );

        $medilife = Company::updateOrCreate(
            ['code' => 'MEDILIFE'],
            ['name' => 'MediLife Co.', 'contact_person' => 'Daw Hnin', 'phone' => '09-420-111111', 'status' => 'active']
        );

        $zenith = Company::updateOrCreate(
            ['code' => 'ZENITH'],
            ['name' => 'Zenith Pharma', 'contact_person' => 'U Kyaw', 'phone' => '09-420-222222', 'status' => 'active']
        );

        $tablet = Unit::updateOrCreate(['abbreviation' => 'Tab'], ['name' => 'Tablet', 'status' => 'active']);
        $strip = Unit::updateOrCreate(['abbreviation' => 'Strip'], ['name' => 'Strip', 'status' => 'active']);
        $box = Unit::updateOrCreate(['abbreviation' => 'Box'], ['name' => 'Box', 'status' => 'active']);
        $bottle = Unit::updateOrCreate(['abbreviation' => 'Bot'], ['name' => 'Bottle', 'status' => 'active']);
        $carton = Unit::updateOrCreate(['abbreviation' => 'Ctn'], ['name' => 'Carton', 'status' => 'active']);

        $painRelief = ProductCategory::updateOrCreate(
            ['code' => 'PAIN'],
            ['name' => 'Pain Relief', 'status' => 'active']
        );

        $vitamins = ProductCategory::updateOrCreate(
            ['code' => 'VIT'],
            ['name' => 'Vitamins', 'status' => 'active']
        );

        $medilifeBrand = Brand::updateOrCreate(
            ['code' => 'ML-CARE'],
            ['company_id' => $medilife->id, 'name' => 'MediLife Care', 'status' => 'active']
        );

        $zenithBrand = Brand::updateOrCreate(
            ['code' => 'ZN-PLUS'],
            ['company_id' => $zenith->id, 'name' => 'Zenith Plus', 'status' => 'active']
        );

        $paracetamol = Product::updateOrCreate(
            ['sku' => 'ML-PARA-500'],
            [
                'company_id' => $medilife->id,
                'product_category_id' => $painRelief->id,
                'brand' => $medilifeBrand->name,
                'base_unit_id' => $tablet->id,
                'barcode' => '9551000005001',
                'name' => 'Paracetamol 500mg',
                'default_discount_percentage' => 2,
                'commission_rate_percentage' => 1.5,
                'low_stock_threshold_base_units' => 500,
                'status' => 'active',
            ]
        );

        $coughSyrup = Product::updateOrCreate(
            ['sku' => 'ML-COUGH-100'],
            [
                'company_id' => $medilife->id,
                'product_category_id' => $painRelief->id,
                'brand' => $medilifeBrand->name,
                'base_unit_id' => $bottle->id,
                'barcode' => '9551000001007',
                'name' => 'Cough Relief Syrup 100ml',
                'default_discount_percentage' => 1,
                'commission_rate_percentage' => 2,
                'low_stock_threshold_base_units' => 60,
                'status' => 'active',
            ]
        );

        $vitaminC = Product::updateOrCreate(
            ['sku' => 'ZN-VITC-100'],
            [
                'company_id' => $zenith->id,
                'product_category_id' => $vitamins->id,
                'brand' => $zenithBrand->name,
                'base_unit_id' => $bottle->id,
                'barcode' => '9552000001004',
                'name' => 'Vitamin C 100 Tablets',
                'default_discount_percentage' => 3,
                'commission_rate_percentage' => 2,
                'low_stock_threshold_base_units' => 80,
                'status' => 'active',
            ]
        );

        $this->seedProductUnits($paracetamol, [
            [$tablet, 1, 120, true, false],
            [$strip, 10, 1100, false, true],
            [$box, 100, 10000, false, false],
            [$carton, 1000, 95000, false, false],
        ]);

        $this->seedProductUnits($coughSyrup, [
            [$bottle, 1, 4500, true, true],
            [$carton, 12, 51000, false, false],
        ]);

        $this->seedProductUnits($vitaminC, [
            [$bottle, 1, 8500, true, true],
            [$carton, 24, 195000, false, false],
        ]);

        $salesRep = SalesRepresentative::updateOrCreate(
            ['employee_code' => 'SR-0001'],
            [
                'user_id' => $salesUser->id,
                'company_id' => $medilife->id,
                'phone' => '09-400-000002',
                'region' => 'Mandalay',
                'joined_at' => now()->subYear()->toDateString(),
                'status' => 'active',
            ]
        );

        $aung = Customer::updateOrCreate(
            ['code' => 'CUS-0001'],
            [
                'name' => 'Aung Pharmacy',
                'owner_name' => 'U Aung',
                'phone' => '09-430-111111',
                'address' => 'Chan Aye Thar Zan',
                'city' => 'Mandalay',
                'region' => 'Mandalay',
                'status' => 'active',
            ]
        );

        $shwe = Customer::updateOrCreate(
            ['code' => 'CUS-0002'],
            [
                'name' => 'Shwe Clinic Store',
                'owner_name' => 'Daw Shwe',
                'phone' => '09-430-222222',
                'address' => 'Aungmyaythazan',
                'city' => 'Mandalay',
                'region' => 'Mandalay',
                'status' => 'active',
            ]
        );

        $aungCredit = CustomerCompanyCreditStatus::updateOrCreate(
            ['customer_id' => $aung->id, 'company_id' => $medilife->id],
            ['credit_status' => 'blocked', 'credit_limit' => 500000, 'outstanding_balance' => 320000, 'overdue_days' => 32, 'reason' => 'Overdue invoice aging']
        );

        CustomerCompanyCreditStatus::updateOrCreate(
            ['customer_id' => $shwe->id, 'company_id' => $medilife->id],
            ['credit_status' => 'active', 'credit_limit' => 500000, 'outstanding_balance' => 0, 'overdue_days' => 0]
        );

        $warehouse = Warehouse::updateOrCreate(
            ['code' => 'MAIN'],
            ['name' => 'Main Warehouse', 'address' => 'Mandalay distribution hub', 'status' => 'active']
        );

        FocRule::updateOrCreate(
            ['company_id' => $medilife->id, 'product_id' => $paracetamol->id, 'rule_type' => 'quantity'],
            [
                'minimum_quantity_base_units' => 1000,
                'minimum_order_value' => null,
                'reward_quantity_base_units' => 100,
                'starts_at' => now()->startOfMonth()->toDateString(),
                'ends_at' => now()->endOfMonth()->toDateString(),
                'status' => 'active',
            ]
        );

        $paracetamolBatch = StockBatch::updateOrCreate(
            ['company_id' => $medilife->id, 'warehouse_id' => $warehouse->id, 'product_id' => $paracetamol->id, 'batch_no' => 'ML-PARA-B2606'],
            [
                'expiry_date' => now()->addMonths(10)->toDateString(),
                'received_base_quantity' => 20000,
                'available_base_quantity' => 15200,
                'reserved_base_quantity' => 1000,
                'sold_base_quantity' => 3800,
            ]
        );

        StockMovement::updateOrCreate(
            ['reference_type' => 'seed', 'reference_id' => 1, 'product_id' => $paracetamol->id, 'movement_type' => 'receipt'],
            [
                'company_id' => $medilife->id,
                'warehouse_id' => $warehouse->id,
                'stock_batch_id' => $paracetamolBatch->id,
                'base_unit_quantity' => 20000,
                'note' => 'Opening stock for demo operations',
                'created_by' => $adminUser->id,
            ]
        );

        $coughBatch = StockBatch::updateOrCreate(
            ['company_id' => $medilife->id, 'warehouse_id' => $warehouse->id, 'product_id' => $coughSyrup->id, 'batch_no' => 'ML-COUGH-B2606'],
            [
                'expiry_date' => now()->addMonths(7)->toDateString(),
                'received_base_quantity' => 900,
                'available_base_quantity' => 640,
                'reserved_base_quantity' => 24,
                'sold_base_quantity' => 236,
            ]
        );

        StockMovement::updateOrCreate(
            ['reference_type' => 'seed', 'reference_id' => 3, 'product_id' => $coughSyrup->id, 'movement_type' => 'receipt'],
            [
                'company_id' => $medilife->id,
                'warehouse_id' => $warehouse->id,
                'stock_batch_id' => $coughBatch->id,
                'base_unit_quantity' => 900,
                'note' => 'Opening stock for demo operations',
                'created_by' => $adminUser->id,
            ]
        );

        $vitaminBatch = StockBatch::updateOrCreate(
            ['company_id' => $zenith->id, 'warehouse_id' => $warehouse->id, 'product_id' => $vitaminC->id, 'batch_no' => 'ZN-VITC-B2606'],
            [
                'expiry_date' => now()->addMonths(8)->toDateString(),
                'received_base_quantity' => 800,
                'available_base_quantity' => 420,
                'reserved_base_quantity' => 24,
                'sold_base_quantity' => 356,
            ]
        );

        StockMovement::updateOrCreate(
            ['reference_type' => 'seed', 'reference_id' => 2, 'product_id' => $vitaminC->id, 'movement_type' => 'receipt'],
            [
                'company_id' => $zenith->id,
                'warehouse_id' => $warehouse->id,
                'stock_batch_id' => $vitaminBatch->id,
                'base_unit_quantity' => 800,
                'note' => 'Opening stock for demo operations',
                'created_by' => $adminUser->id,
            ]
        );

        $submittedOrder = SalesOrder::updateOrCreate(
            ['order_no' => 'SO-DEMO-1001'],
            [
                'company_id' => $medilife->id,
                'customer_id' => $shwe->id,
                'sales_representative_id' => $salesRep->id,
                'order_date' => now()->toDateString(),
                'requested_delivery_date' => now()->addDays(2)->toDateString(),
                'status' => 'submitted',
                'subtotal_amount' => 100000,
                'discount_amount' => 2000,
                'foc_value_amount' => 12000,
                'total_amount' => 98000,
                'note' => 'Demo order from sales app with one product line',
                'created_by' => $salesUser->id,
            ]
        );

        SalesOrderItem::updateOrCreate(
            ['sales_order_id' => $submittedOrder->id, 'product_id' => $paracetamol->id],
            [
                'unit_id' => $box->id,
                'quantity' => 10,
                'conversion_factor_to_base' => 100,
                'base_unit_quantity' => 1000,
                'unit_price' => 10000,
                'discount_percentage' => 2,
                'discount_amount' => 2000,
                'foc_base_unit_quantity' => 100,
                'line_total' => 98000,
                'commission_rate_percentage' => 1.5,
                'commission_amount' => 1470,
            ]
        );

        SalesOrderFocItem::updateOrCreate(
            ['sales_order_id' => $submittedOrder->id, 'product_id' => $paracetamol->id],
            [
                'reward_base_unit_quantity' => 100,
                'estimated_value_amount' => 12000,
            ]
        );

        $approvedOrder = SalesOrder::updateOrCreate(
            ['order_no' => 'SO-DEMO-1000'],
            [
                'company_id' => $medilife->id,
                'customer_id' => $shwe->id,
                'sales_representative_id' => $salesRep->id,
                'order_date' => now()->subDays(4)->toDateString(),
                'requested_delivery_date' => now()->subDays(2)->toDateString(),
                'status' => 'invoiced',
                'subtotal_amount' => 200000,
                'discount_amount' => 4000,
                'foc_value_amount' => 12000,
                'total_amount' => 196000,
                'approved_by' => $adminUser->id,
                'approved_at' => now()->subDays(3),
                'created_by' => $salesUser->id,
            ]
        );

        $approvedOrderItem = SalesOrderItem::updateOrCreate(
            ['sales_order_id' => $approvedOrder->id, 'product_id' => $paracetamol->id],
            [
                'unit_id' => $box->id,
                'quantity' => 20,
                'conversion_factor_to_base' => 100,
                'base_unit_quantity' => 2000,
                'unit_price' => 10000,
                'discount_percentage' => 2,
                'discount_amount' => 4000,
                'foc_base_unit_quantity' => 100,
                'line_total' => 196000,
                'commission_rate_percentage' => 1.5,
                'commission_amount' => 2940,
            ]
        );

        $invoice = Invoice::updateOrCreate(
            ['invoice_no' => 'INV-DEMO-1000'],
            [
                'sales_order_id' => $approvedOrder->id,
                'company_id' => $medilife->id,
                'customer_id' => $shwe->id,
                'sales_representative_id' => $salesRep->id,
                'invoice_date' => now()->subDays(3)->toDateString(),
                'due_date' => now()->addDays(27)->toDateString(),
                'status' => 'partial',
                'subtotal_amount' => 200000,
                'discount_amount' => 4000,
                'foc_value_amount' => 12000,
                'total_amount' => 196000,
                'paid_amount' => 96000,
                'balance_amount' => 100000,
                'created_by' => $adminUser->id,
            ]
        );

        InvoiceItem::updateOrCreate(
            ['invoice_id' => $invoice->id, 'product_id' => $paracetamol->id],
            [
                'sales_order_item_id' => $approvedOrderItem->id,
                'unit_id' => $box->id,
                'quantity' => 20,
                'conversion_factor_to_base' => 100,
                'base_unit_quantity' => 2000,
                'unit_price' => 10000,
                'discount_percentage' => 2,
                'discount_amount' => 4000,
                'foc_base_unit_quantity' => 100,
                'line_total' => 196000,
            ]
        );

        $payment = Payment::updateOrCreate(
            ['payment_no' => 'PAY-DEMO-1000'],
            [
                'company_id' => $medilife->id,
                'customer_id' => $shwe->id,
                'payment_date' => now()->subDay()->toDateString(),
                'amount' => 96000,
                'payment_method' => 'cash',
                'reference_no' => 'CASH-DEMO',
                'note' => 'Partial payment against demo invoice',
                'created_by' => $adminUser->id,
            ]
        );

        PaymentAllocation::updateOrCreate(
            ['payment_id' => $payment->id, 'invoice_id' => $invoice->id],
            ['allocated_amount' => 96000]
        );

        CustomerBalance::updateOrCreate(
            ['customer_id' => $shwe->id, 'company_id' => $medilife->id],
            [
                'invoice_total' => 196000,
                'payment_total' => 96000,
                'balance_amount' => 100000,
                'last_calculated_at' => now(),
            ]
        );

        $blockedInvoice = Invoice::updateOrCreate(
            ['invoice_no' => 'INV-DEMO-BLOCKED'],
            [
                'company_id' => $medilife->id,
                'customer_id' => $aung->id,
                'sales_representative_id' => $salesRep->id,
                'invoice_date' => now()->subDays(40)->toDateString(),
                'due_date' => now()->subDays(32)->toDateString(),
                'status' => 'issued',
                'subtotal_amount' => 320000,
                'total_amount' => 320000,
                'balance_amount' => 320000,
                'created_by' => $adminUser->id,
            ]
        );

        $aungCredit->update(['blocked_invoice_id' => $blockedInvoice->id]);

        Setting::updateOrCreate(
            ['key' => 'invoice_due_days'],
            ['setting_group' => 'finance', 'value' => '30', 'value_type' => 'integer']
        );
    }

    private function seedProductUnits(Product $product, array $units)
    {
        foreach ($units as [$unit, $conversionFactor, $sellingPrice, $isBaseUnit, $isDefaultSalesUnit]) {
            ProductUnit::updateOrCreate(
                ['product_id' => $product->id, 'unit_id' => $unit->id],
                [
                    'conversion_factor_to_base' => $conversionFactor,
                    'selling_price' => $sellingPrice,
                    'is_base_unit' => $isBaseUnit,
                    'is_default_sales_unit' => $isDefaultSalesUnit,
                    'status' => 'active',
                ]
            );
        }
    }
}
