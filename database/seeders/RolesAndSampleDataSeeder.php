<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\CompanyPayable;
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
use App\Models\StockReceipt;
use App\Models\StockReceiptItem;
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
            ['display_name' => 'Admin', 'description' => 'Office administrator', 'permissions' => ['*']]
        );

        $salesRole = Role::updateOrCreate(
            ['name' => 'sales_representative'],
            ['display_name' => 'Sales Representative', 'description' => 'Mobile sales app user', 'permissions' => ['sales.app']]
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
            [
                'name' => 'MediLife Healthcare Ltd.',
                'contact_person' => 'Daw Hnin Wai',
                'phone' => '09-420-111111',
                'email' => 'orders@medilife.test',
                'address' => 'No. 18, 62nd Street, Mandalay',
                'status' => 'active',
            ]
        );

        $zenith = Company::updateOrCreate(
            ['code' => 'ZENITH'],
            [
                'name' => 'Zenith Pharma Distribution',
                'contact_person' => 'U Kyaw Min',
                'phone' => '09-420-222222',
                'email' => 'supply@zenithpharma.test',
                'address' => 'Warehouse Road, Hlaing Township, Yangon',
                'status' => 'active',
            ]
        );

        $apex = Company::updateOrCreate(
            ['code' => 'APEXMED'],
            [
                'name' => 'Apex Medical Supplies',
                'contact_person' => 'Daw Thandar',
                'phone' => '09-420-333333',
                'email' => 'sales@apexmed.test',
                'address' => 'Bayint Naung Wholesale Center, Yangon',
                'status' => 'active',
            ]
        );

        $tablet = Unit::updateOrCreate(['abbreviation' => 'Tab'], ['name' => 'Tablet', 'status' => 'active']);
        $capsule = Unit::updateOrCreate(['abbreviation' => 'Cap'], ['name' => 'Capsule', 'status' => 'active']);
        $strip = Unit::updateOrCreate(['abbreviation' => 'Strip'], ['name' => 'Strip', 'status' => 'active']);
        $box = Unit::updateOrCreate(['abbreviation' => 'Box'], ['name' => 'Box', 'status' => 'active']);
        $bottle = Unit::updateOrCreate(['abbreviation' => 'Bot'], ['name' => 'Bottle', 'status' => 'active']);
        $carton = Unit::updateOrCreate(['abbreviation' => 'Ctn'], ['name' => 'Carton', 'status' => 'active']);
        $sachet = Unit::updateOrCreate(['abbreviation' => 'Sachet'], ['name' => 'Sachet', 'status' => 'active']);

        $painRelief = ProductCategory::updateOrCreate(
            ['code' => 'PAIN'],
            ['name' => 'Pain Relief', 'status' => 'active']
        );

        $coldCough = ProductCategory::updateOrCreate(
            ['code' => 'COUGH'],
            ['name' => 'Cold & Cough', 'status' => 'active']
        );

        $antibiotics = ProductCategory::updateOrCreate(
            ['code' => 'ANTI'],
            ['name' => 'Antibiotics', 'status' => 'active']
        );

        $vitamins = ProductCategory::updateOrCreate(
            ['code' => 'VIT'],
            ['name' => 'Vitamins', 'status' => 'active']
        );

        $digestive = ProductCategory::updateOrCreate(
            ['code' => 'DIGEST'],
            ['name' => 'Digestive & Rehydration', 'status' => 'active']
        );

        $medilifeBrand = Brand::updateOrCreate(
            ['code' => 'ML-CARE'],
            ['company_id' => $medilife->id, 'name' => 'MediLife Care', 'status' => 'active']
        );

        $zenithBrand = Brand::updateOrCreate(
            ['code' => 'ZN-PLUS'],
            ['company_id' => $zenith->id, 'name' => 'Zenith Plus', 'status' => 'active']
        );

        $apexBrand = Brand::updateOrCreate(
            ['code' => 'AP-ESS'],
            ['company_id' => $apex->id, 'name' => 'Apex Essentials', 'status' => 'active']
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
                'product_category_id' => $coldCough->id,
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

        $cetirizine = Product::updateOrCreate(
            ['sku' => 'ML-CET-10'],
            [
                'company_id' => $medilife->id,
                'product_category_id' => $coldCough->id,
                'brand' => $medilifeBrand->name,
                'base_unit_id' => $tablet->id,
                'barcode' => '9551000000010',
                'name' => 'Cetirizine 10mg Tablet',
                'default_discount_percentage' => 1.5,
                'commission_rate_percentage' => 1,
                'low_stock_threshold_base_units' => 300,
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

        $amoxicillin = Product::updateOrCreate(
            ['sku' => 'ZN-AMOX-250'],
            [
                'company_id' => $zenith->id,
                'product_category_id' => $antibiotics->id,
                'brand' => $zenithBrand->name,
                'base_unit_id' => $capsule->id,
                'barcode' => '9552000002506',
                'name' => 'Amoxicillin 250mg Capsule',
                'default_discount_percentage' => 2,
                'commission_rate_percentage' => 1.8,
                'low_stock_threshold_base_units' => 400,
                'status' => 'active',
            ]
        );

        $ors = Product::updateOrCreate(
            ['sku' => 'AP-ORS-LEMON'],
            [
                'company_id' => $apex->id,
                'product_category_id' => $digestive->id,
                'brand' => $apexBrand->name,
                'base_unit_id' => $sachet->id,
                'barcode' => '9553000000201',
                'name' => 'ORS Lemon Sachet',
                'default_discount_percentage' => 1,
                'commission_rate_percentage' => 1.2,
                'low_stock_threshold_base_units' => 500,
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

        $this->seedProductUnits($cetirizine, [
            [$tablet, 1, 90, true, false],
            [$strip, 10, 850, false, true],
            [$box, 100, 8000, false, false],
        ]);

        $this->seedProductUnits($vitaminC, [
            [$bottle, 1, 8500, true, true],
            [$carton, 24, 195000, false, false],
        ]);

        $this->seedProductUnits($amoxicillin, [
            [$capsule, 1, 180, true, false],
            [$strip, 10, 1700, false, true],
            [$box, 100, 16000, false, false],
        ]);

        $this->seedProductUnits($ors, [
            [$sachet, 1, 350, true, false],
            [$box, 50, 16500, false, true],
            [$carton, 500, 155000, false, false],
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

        $yangonWarehouse = Warehouse::updateOrCreate(
            ['code' => 'YGN-HUB'],
            ['name' => 'Yangon Warehouse', 'address' => 'Hlaing township dispatch hub', 'status' => 'active']
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

        StockMovement::where('reference_type', 'seed')->delete();

        $this->seedStockReceipt(
            'SR-DEMO-2606-001',
            $medilife,
            $warehouse,
            $adminUser,
            [
                'supplier_invoice_no' => 'ML-INV-2606-041',
                'received_date' => now()->subDays(12)->toDateString(),
                'payable_due_date' => now()->addDays(18)->toDateString(),
                'paid_amount' => 800000,
            ],
            [
                [
                    'product' => $paracetamol,
                    'unit' => $carton,
                    'quantity' => 20,
                    'unit_cost' => 76000,
                    'foc_unit' => $box,
                    'foc_quantity' => 10,
                    'batch_no' => 'ML-PARA-B2606',
                    'manufactured_date' => now()->subMonths(3)->toDateString(),
                    'expiry_date' => now()->addMonths(21)->toDateString(),
                    'available_base_quantity' => 16200,
                    'reserved_base_quantity' => 1000,
                    'sold_base_quantity' => 3800,
                ],
                [
                    'product' => $coughSyrup,
                    'unit' => $carton,
                    'quantity' => 75,
                    'unit_cost' => 42000,
                    'foc_unit' => $bottle,
                    'foc_quantity' => 24,
                    'batch_no' => 'ML-COUGH-B2606',
                    'manufactured_date' => now()->subMonths(2)->toDateString(),
                    'expiry_date' => now()->addMonths(16)->toDateString(),
                    'available_base_quantity' => 664,
                    'reserved_base_quantity' => 24,
                    'sold_base_quantity' => 236,
                ],
            ]
        );

        $this->seedStockReceipt(
            'SR-DEMO-2606-002',
            $zenith,
            $warehouse,
            $adminUser,
            [
                'supplier_invoice_no' => 'ZN-INV-2606-118',
                'received_date' => now()->subDays(8)->toDateString(),
                'payable_due_date' => now()->addDays(22)->toDateString(),
                'paid_amount' => 500000,
            ],
            [
                [
                    'product' => $vitaminC,
                    'unit' => $carton,
                    'quantity' => 40,
                    'unit_cost' => 158000,
                    'foc_unit' => $bottle,
                    'foc_quantity' => 20,
                    'batch_no' => 'ZN-VITC-B2606',
                    'manufactured_date' => now()->subMonths(1)->toDateString(),
                    'expiry_date' => now()->addMonths(18)->toDateString(),
                    'available_base_quantity' => 440,
                    'reserved_base_quantity' => 24,
                    'sold_base_quantity' => 516,
                ],
                [
                    'product' => $amoxicillin,
                    'unit' => $box,
                    'quantity' => 35,
                    'unit_cost' => 13200,
                    'foc_unit' => $strip,
                    'foc_quantity' => 20,
                    'batch_no' => 'ZN-AMOX-B2606',
                    'manufactured_date' => now()->subMonths(4)->toDateString(),
                    'expiry_date' => now()->addMonths(14)->toDateString(),
                    'available_base_quantity' => 3250,
                    'reserved_base_quantity' => 150,
                    'sold_base_quantity' => 300,
                ],
            ]
        );

        $this->seedStockReceipt(
            'SR-DEMO-2606-003',
            $apex,
            $yangonWarehouse,
            $adminUser,
            [
                'supplier_invoice_no' => 'APX-INV-2606-027',
                'received_date' => now()->subDays(4)->toDateString(),
                'payable_due_date' => now()->addDays(26)->toDateString(),
                'paid_amount' => 250000,
            ],
            [
                [
                    'product' => $ors,
                    'unit' => $carton,
                    'quantity' => 12,
                    'unit_cost' => 128000,
                    'foc_unit' => $box,
                    'foc_quantity' => 8,
                    'batch_no' => 'AP-ORS-B2606',
                    'manufactured_date' => now()->subMonths(1)->toDateString(),
                    'expiry_date' => now()->addMonths(23)->toDateString(),
                    'available_base_quantity' => 5600,
                    'reserved_base_quantity' => 0,
                    'sold_base_quantity' => 800,
                ],
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

    private function seedStockReceipt(string $receiptNo, Company $company, Warehouse $warehouse, User $actor, array $receiptData, array $items): StockReceipt
    {
        $receipt = StockReceipt::updateOrCreate(
            ['receipt_no' => $receiptNo],
            [
                'company_id' => $company->id,
                'warehouse_id' => $warehouse->id,
                'received_date' => $receiptData['received_date'] ?? now()->toDateString(),
                'supplier_invoice_no' => $receiptData['supplier_invoice_no'] ?? null,
                'payable_due_date' => $receiptData['payable_due_date'] ?? null,
                'status' => 'posted',
                'created_by' => $actor->id,
            ]
        );

        StockMovement::query()
            ->where('reference_type', StockReceipt::class)
            ->where('reference_id', $receipt->id)
            ->delete();
        StockReceiptItem::where('stock_receipt_id', $receipt->id)->delete();
        CompanyPayable::withTrashed()->where('stock_receipt_id', $receipt->id)->forceDelete();

        $subtotal = 0;
        $commissionTotal = 0;

        foreach ($items as $item) {
            /** @var Product $product */
            $product = $item['product'];
            /** @var Unit $unit */
            $unit = $item['unit'];
            $productUnit = ProductUnit::where('product_id', $product->id)
                ->where('unit_id', $unit->id)
                ->firstOrFail();
            $quantity = (int) $item['quantity'];
            $paidBaseQuantity = $quantity * (int) $productUnit->conversion_factor_to_base;
            $focQuantity = (int) ($item['foc_quantity'] ?? 0);
            $focUnit = $item['foc_unit'] ?? $unit;
            $focProductUnit = $focQuantity > 0
                ? ProductUnit::where('product_id', $product->id)->where('unit_id', $focUnit->id)->firstOrFail()
                : null;
            $focBaseQuantity = $focProductUnit ? $focQuantity * (int) $focProductUnit->conversion_factor_to_base : 0;
            $baseQuantity = $paidBaseQuantity + $focBaseQuantity;
            $unitCost = (float) $item['unit_cost'];
            $grossLineTotal = $quantity * $unitCost;
            $commissionRate = (float) ($product->commission_rate_percentage ?? 0);
            $commissionAmount = $grossLineTotal * $commissionRate / 100;
            $lineTotal = max(0, $grossLineTotal - $commissionAmount);
            $subtotal += $grossLineTotal;
            $commissionTotal += $commissionAmount;

            StockReceiptItem::create([
                'stock_receipt_id' => $receipt->id,
                'product_id' => $product->id,
                'unit_id' => $unit->id,
                'foc_unit_id' => $focProductUnit?->unit_id,
                'quantity' => $quantity,
                'foc_quantity' => $focQuantity,
                'conversion_factor_to_base' => $productUnit->conversion_factor_to_base,
                'foc_conversion_factor_to_base' => $focProductUnit?->conversion_factor_to_base ?? 1,
                'base_unit_quantity' => $baseQuantity,
                'foc_base_unit_quantity' => $focBaseQuantity,
                'unit_cost' => $unitCost,
                'commission_rate_percentage' => $commissionRate,
                'commission_amount' => $commissionAmount,
                'line_total' => $lineTotal,
                'batch_no' => $item['batch_no'] ?? null,
                'manufactured_date' => $item['manufactured_date'] ?? null,
                'expiry_date' => $item['expiry_date'] ?? null,
            ]);

            $reserved = (int) ($item['reserved_base_quantity'] ?? 0);
            $sold = (int) ($item['sold_base_quantity'] ?? 0);
            $damaged = (int) ($item['damaged_base_quantity'] ?? 0);
            $expired = (int) ($item['expired_base_quantity'] ?? 0);
            $available = array_key_exists('available_base_quantity', $item)
                ? (int) $item['available_base_quantity']
                : max(0, $baseQuantity - $reserved - $sold - $damaged - $expired);

            $batch = StockBatch::updateOrCreate(
                [
                    'company_id' => $company->id,
                    'warehouse_id' => $warehouse->id,
                    'product_id' => $product->id,
                    'batch_no' => $item['batch_no'] ?? null,
                ],
                [
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'received_base_quantity' => $baseQuantity,
                    'available_base_quantity' => $available,
                    'reserved_base_quantity' => $reserved,
                    'sold_base_quantity' => $sold,
                    'damaged_base_quantity' => $damaged,
                    'expired_base_quantity' => $expired,
                ]
            );

            StockMovement::create([
                'company_id' => $company->id,
                'warehouse_id' => $warehouse->id,
                'product_id' => $product->id,
                'stock_batch_id' => $batch->id,
                'movement_type' => 'receipt',
                'base_unit_quantity' => $baseQuantity,
                'reference_type' => StockReceipt::class,
                'reference_id' => $receipt->id,
                'note' => "Seeded receiving {$receiptNo}",
                'created_by' => $actor->id,
            ]);
        }

        $paidAmount = (float) ($receiptData['paid_amount'] ?? 0);
        $total = max(0, $subtotal - $commissionTotal);
        $due = max(0, $total - $paidAmount);
        $paymentStatus = $due <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'unpaid');

        $receipt->update([
            'subtotal_amount' => $subtotal,
            'discount_amount' => $commissionTotal,
            'total_amount' => $total,
            'paid_amount' => $paidAmount,
            'due_amount' => $due,
            'payment_status' => $paymentStatus,
        ]);

        CompanyPayable::create([
            'company_id' => $company->id,
            'stock_receipt_id' => $receipt->id,
            'payable_date' => $receipt->received_date,
            'due_date' => $receipt->payable_due_date,
            'amount' => $total,
            'paid_amount' => $paidAmount,
            'balance_amount' => $due,
            'status' => $paymentStatus,
        ]);

        return $receipt;
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
