<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerCompanyCreditStatus;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\Role;
use App\Models\SalesRepresentative;
use App\Models\Setting;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RealDataSeeder extends Seeder
{
    private array $unitMap = [];

    public function run(): void
    {
        $roles = $this->seedRoles();
        $companies = $this->seedCompanies();
        $categories = $this->seedCategories();
        $this->seedUnits();
        $this->seedBrands($companies);
        $this->seedUsersAndSalesRepresentatives($roles, $companies);
        $this->seedPharmacies($companies);
        $this->seedWarehouses();
        $this->seedMedicines($companies, $categories);
        $this->seedSettings();
    }

    private function seedRoles(): array
    {
        return [
            'super_admin' => Role::updateOrCreate(
                ['name' => 'super_admin'],
                ['display_name' => 'Super Admin', 'description' => 'Full office administration access', 'permissions' => ['*']]
            ),
            'admin' => Role::updateOrCreate(
                ['name' => 'admin'],
                ['display_name' => 'Admin', 'description' => 'Office administrator', 'permissions' => ['*']]
            ),
            'office_operator' => Role::updateOrCreate(
                ['name' => 'office_operator'],
                ['display_name' => 'Office Operator', 'description' => 'Daily order, customer, product, and stock operation access.', 'permissions' => ['office.dashboard', 'office.operations', 'office.master-data']]
            ),
            'finance_manager' => Role::updateOrCreate(
                ['name' => 'finance_manager'],
                ['display_name' => 'Finance Manager', 'description' => 'Finance ledger, payment, payable, receivable, and report access.', 'permissions' => ['office.dashboard', 'office.finance', 'office.reports']]
            ),
            'inventory_manager' => Role::updateOrCreate(
                ['name' => 'inventory_manager'],
                ['display_name' => 'Inventory Manager', 'description' => 'Inventory, receiving, warehouse, product, and transfer access.', 'permissions' => ['office.dashboard', 'office.operations', 'office.master-data']]
            ),
            'sales_representative' => Role::updateOrCreate(
                ['name' => 'sales_representative'],
                ['display_name' => 'Sales Representative', 'description' => 'Mobile sales app user', 'permissions' => ['sales.app']]
            ),
        ];
    }

    private function seedCompanies(): array
    {
        $rows = [
            [
                'code' => 'APEXMED',
                'name' => 'Apex Medical Supplies',
                'contact_person' => 'Daw Thandar Aye',
                'phone' => '09-420-333333',
                'email' => 'sales@apexmed.test',
                'address' => 'Bayint Naung Wholesale Center, Yangon',
            ],
            [
                'code' => 'MEDILIFE',
                'name' => 'MediLife Healthcare Ltd.',
                'contact_person' => 'Daw Hnin Wai',
                'phone' => '09-420-111111',
                'email' => 'orders@medilife.test',
                'address' => 'No. 18, 62nd Street, Mandalay',
            ],
            [
                'code' => 'NOVA',
                'name' => 'NovaCare Pharma Co.',
                'contact_person' => 'U Min Ko',
                'phone' => '09-420-444444',
                'email' => 'supply@novacare.test',
                'address' => 'Industrial Zone 2, Naypyidaw',
            ],
            [
                'code' => 'ZENITH',
                'name' => 'Zenith Pharma Distribution',
                'contact_person' => 'U Kyaw Min',
                'phone' => '09-420-222222',
                'email' => 'supply@zenithpharma.test',
                'address' => 'Warehouse Road, Hlaing Township, Yangon',
            ],
        ];

        return collect($rows)
            ->mapWithKeys(fn (array $row) => [
                $row['code'] => Company::updateOrCreate(
                    ['code' => $row['code']],
                    $row + ['status' => 'active']
                ),
            ])
            ->all();
    }

    private function seedCategories(): array
    {
        $rows = [
            ['code' => 'ANALG', 'name' => 'Analgesics & Pain Relief'],
            ['code' => 'ANTIB', 'name' => 'Antibiotics'],
            ['code' => 'ANTIH', 'name' => 'Antihistamines'],
            ['code' => 'CARDIO', 'name' => 'Cardiovascular'],
            ['code' => 'COUGH', 'name' => 'Cold & Cough'],
            ['code' => 'DERMA', 'name' => 'Dermatology'],
            ['code' => 'DIAB', 'name' => 'Diabetes Care'],
            ['code' => 'DIGEST', 'name' => 'Digestive & Rehydration'],
            ['code' => 'RESP', 'name' => 'Respiratory'],
            ['code' => 'VIT', 'name' => 'Vitamins & Supplements'],
        ];

        return collect($rows)
            ->mapWithKeys(fn (array $row) => [
                $row['code'] => ProductCategory::updateOrCreate(
                    ['code' => $row['code']],
                    ['name' => $row['name'], 'status' => 'active']
                ),
            ])
            ->all();
    }

    private function seedUnits(): void
    {
        $rows = [
            ['Tablet', 'Tab'],
            ['Capsule', 'Cap'],
            ['Bottle', 'Bot'],
            ['Vial', 'Vial'],
            ['Ampoule', 'Amp'],
            ['Sachet', 'Sach'],
            ['Tube', 'Tube'],
            ['Strip', 'Strip'],
            ['Box', 'Box'],
            ['Carton', 'Ctn'],
        ];

        foreach ($rows as [$name, $abbreviation]) {
            $this->unitMap[$abbreviation] = Unit::updateOrCreate(
                ['abbreviation' => $abbreviation],
                ['name' => $name, 'status' => 'active']
            );
        }
    }

    private function seedBrands(array $companies): void
    {
        foreach ($companies as $code => $company) {
            Brand::updateOrCreate(
                ['code' => "{$code}-CORE"],
                ['company_id' => $company->id, 'name' => Str::headline(strtolower($code)) . ' Core', 'status' => 'active']
            );

            Brand::updateOrCreate(
                ['code' => "{$code}-PLUS"],
                ['company_id' => $company->id, 'name' => Str::headline(strtolower($code)) . ' Plus', 'status' => 'active']
            );
        }
    }

    private function seedUsersAndSalesRepresentatives(array $roles, array $companies): void
    {
        $legacySuperAdmin = User::withTrashed()
            ->where('email', 'superadmin@pharmacy-dis.test')
            ->first();

        if ($legacySuperAdmin && ! User::withTrashed()->where('email', 'admin@paramacy.test')->exists()) {
            $legacySuperAdmin->forceFill(['email' => 'admin@paramacy.test'])->save();
            $legacySuperAdmin->restore();
        }

        $legacyMayZin = User::withTrashed()
            ->where('email', 'may.zin@pharmacy-dis.test')
            ->first();

        if ($legacyMayZin && ! User::withTrashed()->where('email', 'mayzin@paramacy.test')->exists()) {
            $legacyMayZin->forceFill(['email' => 'mayzin@paramacy.test'])->save();
            $legacyMayZin->restore();
        }

        User::updateOrCreate(
            ['email' => 'admin@paramacy.test'],
            [
                'role_id' => $roles['super_admin']->id,
                'name' => 'Office Super Admin',
                'phone' => '09-400-000001',
                'user_type' => 'office',
                'status' => 'active',
                'password' => Hash::make('password'),
            ]
        );

        $salesUsers = [
            ['SR-0001', 'May Zin', 'mayzin@paramacy.test', '09-400-000101', 'Yangon North', 'MEDILIFE'],
            ['SR-0002', 'Aung Kyaw', 'aung.kyaw@pharmacy-dis.test', '09-400-000102', 'Mandalay', 'ZENITH'],
            ['SR-0003', 'Thiri Mon', 'thiri.mon@pharmacy-dis.test', '09-400-000103', 'Yangon South', 'APEXMED'],
            ['SR-0004', 'Nyi Nyi', 'nyi.nyi@pharmacy-dis.test', '09-400-000104', 'Naypyidaw', 'NOVA'],
            ['SR-0005', 'Htet Wai', 'htet.wai@pharmacy-dis.test', '09-400-000105', 'Upper Myanmar', 'MEDILIFE'],
        ];

        foreach ($salesUsers as [$employeeCode, $name, $email, $phone, $region, $companyCode]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'role_id' => $roles['sales_representative']->id,
                    'name' => $name,
                    'phone' => $phone,
                    'user_type' => 'sales',
                    'status' => 'active',
                    'password' => Hash::make('password'),
                ]
            );

            SalesRepresentative::updateOrCreate(
                ['employee_code' => $employeeCode],
                [
                    'user_id' => $user->id,
                    'company_id' => $companies[$companyCode]->id,
                    'phone' => $phone,
                    'region' => $region,
                    'joined_at' => now()->subMonths(6)->toDateString(),
                    'status' => 'active',
                ]
            );
        }
    }

    private function seedWarehouses(): void
    {
        Warehouse::updateOrCreate(
            ['code' => 'MAIN'],
            ['name' => 'Main Warehouse', 'address' => 'Primary distribution hub', 'status' => 'active']
        );

        Warehouse::updateOrCreate(
            ['code' => 'YGN-HUB'],
            ['name' => 'Yangon Warehouse', 'address' => 'Hlaing township dispatch hub', 'status' => 'active']
        );
    }

    private function seedPharmacies(array $companies): void
    {
        $rows = [
            ['PH-0001', 'Aung Pharmacy', 'U Aung Myint', '09-430-000001', 'No. 12, Main Road', 'Hlaing', 'Yangon', 'Yangon'],
            ['PH-0002', 'Shwe Clinic Store', 'Daw Shwe Yee', '09-430-000002', '84th Street, Chan Aye Thar Zan', 'Chan Aye Thar Zan', 'Mandalay', 'Mandalay'],
            ['PH-0003', 'Mingalar Pharmacy', 'U Zaw Lin', '09-430-000003', 'Mingalar Market Compound', 'Mingalar Taung Nyunt', 'Yangon', 'Yangon'],
            ['PH-0004', 'Thiri Medical Store', 'Daw Thiri Mon', '09-430-000004', 'No. 45, Bogyoke Road', 'Aungmyaythazan', 'Mandalay', 'Mandalay'],
            ['PH-0005', 'Golden Health Pharmacy', 'U Htet Naing', '09-430-000005', 'Yaza Htarni Road', 'Zabuthiri', 'Naypyidaw', 'Naypyidaw'],
            ['PH-0006', 'Ayar Care Pharmacy', 'Daw May Thu', '09-430-000006', 'River View Street', 'Pathein', 'Pathein', 'Ayeyarwady'],
            ['PH-0007', 'Mawlamyine Family Pharmacy', 'U Kyaw Zin', '09-430-000007', 'Lower Main Road', 'Mawlamyine', 'Mawlamyine', 'Mon'],
            ['PH-0008', 'Pyay Wellness Store', 'Daw Khin Hnin', '09-430-000008', 'Merchant Road', 'Pyay', 'Pyay', 'Bago'],
            ['PH-0009', 'Taunggyi City Pharmacy', 'U Sai Tun', '09-430-000009', 'Circular Road', 'Taunggyi', 'Taunggyi', 'Shan'],
            ['PH-0010', 'Myitkyina Health Point', 'Daw Nang Yu', '09-430-000010', 'Station Road', 'Myitkyina', 'Myitkyina', 'Kachin'],
            ['PH-0011', 'Lashio Medi Mart', 'U Aik Htun', '09-430-000011', 'Theinni Road', 'Lashio', 'Lashio', 'Shan'],
            ['PH-0012', 'Bago Pharmacy Plus', 'Daw Su Su', '09-430-000012', 'Main Bazaar Road', 'Bago', 'Bago', 'Bago'],
            ['PH-0013', 'Hpa-An Care Store', 'U Saw Lah', '09-430-000013', 'Zwe Kabin Road', 'Hpa-An', 'Hpa-An', 'Kayin'],
            ['PH-0014', 'Dawei Medical House', 'Daw Ei Mon', '09-430-000014', 'Strand Road', 'Dawei', 'Dawei', 'Tanintharyi'],
            ['PH-0015', 'Monywa Health Pharmacy', 'U Win Hlaing', '09-430-000015', 'Bogyoke Street', 'Monywa', 'Monywa', 'Sagaing'],
            ['PH-0016', 'Pakokku Family Drug Store', 'Daw Nilar', '09-430-000016', 'Market Road', 'Pakokku', 'Pakokku', 'Magway'],
            ['PH-0017', 'Meiktila Pharmacy', 'U Tun Wai', '09-430-000017', 'Lake Road', 'Meiktila', 'Meiktila', 'Mandalay'],
            ['PH-0018', 'Sittwe Care Pharmacy', 'Daw Khaing Su', '09-430-000018', 'Main Jetty Road', 'Sittwe', 'Sittwe', 'Rakhine'],
            ['PH-0019', 'Loikaw Health Store', 'U Khun Aye', '09-430-000019', 'Hospital Road', 'Loikaw', 'Loikaw', 'Kayah'],
            ['PH-0020', 'Thanlyin Wellness Pharmacy', 'Daw Hnin Ei', '09-430-000020', 'Star City Access Road', 'Thanlyin', 'Yangon', 'Yangon'],
        ];

        foreach ($rows as $index => [$code, $name, $owner, $phone, $address, $township, $city, $region]) {
            $customer = Customer::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'owner_name' => $owner,
                    'phone' => $phone,
                    'email' => Str::slug($name, '.') . '@pharmacy.test',
                    'address' => $address,
                    'township' => $township,
                    'city' => $city,
                    'region' => $region,
                    'status' => 'active',
                ]
            );

            foreach (array_values($companies) as $companyIndex => $company) {
                CustomerCompanyCreditStatus::updateOrCreate(
                    ['customer_id' => $customer->id, 'company_id' => $company->id],
                    [
                        'credit_status' => 'active',
                        'credit_limit' => 750000,
                        'outstanding_balance' => 0,
                        'overdue_days' => 0,
                        'reason' => 'New pharmacy account',
                        'blocked_at' => null,
                    ]
                );
            }
        }
    }

    private function seedMedicines(array $companies, array $categories): void
    {
        $medicineNames = [
            ['Paracetamol 500mg Tablet', 'ANALG', 'Tab', 120],
            ['Ibuprofen 400mg Tablet', 'ANALG', 'Tab', 180],
            ['Diclofenac 50mg Tablet', 'ANALG', 'Tab', 160],
            ['Naproxen 250mg Tablet', 'ANALG', 'Tab', 210],
            ['Aspirin 81mg Tablet', 'CARDIO', 'Tab', 90],
            ['Amoxicillin 250mg Capsule', 'ANTIB', 'Cap', 180],
            ['Amoxicillin 500mg Capsule', 'ANTIB', 'Cap', 260],
            ['Azithromycin 500mg Tablet', 'ANTIB', 'Tab', 980],
            ['Cefixime 200mg Tablet', 'ANTIB', 'Tab', 760],
            ['Ciprofloxacin 500mg Tablet', 'ANTIB', 'Tab', 420],
            ['Cetirizine 10mg Tablet', 'ANTIH', 'Tab', 90],
            ['Loratadine 10mg Tablet', 'ANTIH', 'Tab', 110],
            ['Fexofenadine 120mg Tablet', 'ANTIH', 'Tab', 330],
            ['Chlorpheniramine 4mg Tablet', 'ANTIH', 'Tab', 55],
            ['Diphenhydramine 25mg Capsule', 'ANTIH', 'Cap', 145],
            ['Cough Relief Syrup 100ml', 'COUGH', 'Bot', 4500],
            ['Dextromethorphan Syrup 100ml', 'COUGH', 'Bot', 5200],
            ['Ambroxol Syrup 100ml', 'COUGH', 'Bot', 4800],
            ['Salbutamol Syrup 100ml', 'RESP', 'Bot', 3900],
            ['Menthol Cough Lozenge', 'COUGH', 'Tab', 70],
            ['Omeprazole 20mg Capsule', 'DIGEST', 'Cap', 190],
            ['Pantoprazole 40mg Tablet', 'DIGEST', 'Tab', 260],
            ['Domperidone 10mg Tablet', 'DIGEST', 'Tab', 95],
            ['Loperamide 2mg Capsule', 'DIGEST', 'Cap', 130],
            ['ORS Lemon Sachet', 'DIGEST', 'Sach', 350],
            ['Vitamin C 500mg Tablet', 'VIT', 'Tab', 150],
            ['Vitamin B Complex Tablet', 'VIT', 'Tab', 140],
            ['Multivitamin Capsule', 'VIT', 'Cap', 310],
            ['Calcium D3 Tablet', 'VIT', 'Tab', 280],
            ['Zinc 20mg Tablet', 'VIT', 'Tab', 120],
            ['Amlodipine 5mg Tablet', 'CARDIO', 'Tab', 170],
            ['Losartan 50mg Tablet', 'CARDIO', 'Tab', 240],
            ['Atorvastatin 20mg Tablet', 'CARDIO', 'Tab', 330],
            ['Enalapril 10mg Tablet', 'CARDIO', 'Tab', 160],
            ['Clopidogrel 75mg Tablet', 'CARDIO', 'Tab', 420],
            ['Metformin 500mg Tablet', 'DIAB', 'Tab', 120],
            ['Gliclazide 80mg Tablet', 'DIAB', 'Tab', 190],
            ['Glimepiride 2mg Tablet', 'DIAB', 'Tab', 210],
            ['Insulin Regular Vial', 'DIAB', 'Vial', 14500],
            ['Glucose Oral Gel Tube', 'DIAB', 'Tube', 2700],
            ['Hydrocortisone Cream Tube', 'DERMA', 'Tube', 2800],
            ['Clotrimazole Cream Tube', 'DERMA', 'Tube', 3200],
            ['Mupirocin Ointment Tube', 'DERMA', 'Tube', 4700],
            ['Povidone Iodine Solution 100ml', 'DERMA', 'Bot', 3600],
            ['Silver Sulfadiazine Cream Tube', 'DERMA', 'Tube', 5300],
            ['Salbutamol Inhaler', 'RESP', 'Bot', 9800],
            ['Budesonide Inhaler', 'RESP', 'Bot', 18600],
            ['Montelukast 10mg Tablet', 'RESP', 'Tab', 690],
            ['Theophylline 200mg Tablet', 'RESP', 'Tab', 220],
            ['Ipratropium Nebule Ampoule', 'RESP', 'Amp', 1450],
        ];

        $companyCodes = array_keys($companies);

        for ($index = 0; $index < 100; $index++) {
            [$baseName, $categoryCode, $baseUnitCode, $basePrice] = $medicineNames[$index % count($medicineNames)];
            $companyCode = $companyCodes[$index % count($companyCodes)];
            $company = $companies[$companyCode];
            $cycle = intdiv($index, count($medicineNames)) + 1;
            $variantName = $cycle > 1 ? "{$baseName} Pack {$cycle}" : $baseName;
            $brandName = Str::headline(strtolower($companyCode)) . ($index % 2 === 0 ? ' Core' : ' Plus');
            $sku = "{$companyCode}-MED-" . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);

            $product = Product::updateOrCreate(
                ['sku' => $sku],
                [
                    'company_id' => $company->id,
                    'product_category_id' => $categories[$categoryCode]->id,
                    'brand' => $brandName,
                    'base_unit_id' => $this->unitMap[$baseUnitCode]->id,
                    'barcode' => '955' . str_pad((string) ($index + 1), 10, '0', STR_PAD_LEFT),
                    'name' => $variantName,
                    'description' => "Seeded medicine master record for {$variantName}.",
                    'default_discount_percentage' => ($index % 4) * 0.5,
                    'commission_rate_percentage' => 1 + (($index % 5) * 0.25),
                    'low_stock_threshold_base_units' => $this->lowStockThreshold($baseUnitCode),
                    'status' => 'active',
                ]
            );

            $this->seedMedicineUnits($product, $baseUnitCode, $basePrice + ($cycle - 1) * 20);
        }
    }

    private function seedMedicineUnits(Product $product, string $baseUnitCode, int $basePrice): void
    {
        $unitRows = match ($baseUnitCode) {
            'Tab', 'Cap' => [
                [$baseUnitCode, 1, $basePrice, true, false],
                ['Strip', 10, $basePrice * 10 - 50, false, true],
                ['Box', 100, $basePrice * 100 - 800, false, false],
                ['Ctn', 1000, $basePrice * 1000 - 12000, false, false],
            ],
            'Bot', 'Tube', 'Vial' => [
                [$baseUnitCode, 1, $basePrice, true, true],
                ['Box', 12, $basePrice * 12 - 600, false, false],
                ['Ctn', 48, $basePrice * 48 - 3200, false, false],
            ],
            'Amp' => [
                ['Amp', 1, $basePrice, true, false],
                ['Box', 10, $basePrice * 10 - 300, false, true],
                ['Ctn', 100, $basePrice * 100 - 5000, false, false],
            ],
            'Sach' => [
                ['Sach', 1, $basePrice, true, false],
                ['Box', 50, $basePrice * 50 - 1000, false, true],
                ['Ctn', 500, $basePrice * 500 - 15000, false, false],
            ],
            default => [
                [$baseUnitCode, 1, $basePrice, true, true],
            ],
        };

        foreach ($unitRows as [$unitCode, $conversionFactor, $sellingPrice, $isBaseUnit, $isDefaultSalesUnit]) {
            ProductUnit::updateOrCreate(
                ['product_id' => $product->id, 'unit_id' => $this->unitMap[$unitCode]->id],
                [
                    'conversion_factor_to_base' => $conversionFactor,
                    'selling_price' => max(1, $sellingPrice),
                    'is_base_unit' => $isBaseUnit,
                    'is_default_sales_unit' => $isDefaultSalesUnit,
                    'status' => 'active',
                ]
            );
        }
    }

    private function lowStockThreshold(string $baseUnitCode): int
    {
        return match ($baseUnitCode) {
            'Tab', 'Cap' => 500,
            'Sach' => 1000,
            'Amp' => 100,
            default => 50,
        };
    }

    private function seedSettings(): void
    {
        Setting::updateOrCreate(
            ['key' => 'invoice_due_days'],
            ['setting_group' => 'finance', 'value' => '30', 'value_type' => 'integer']
        );
    }
}
