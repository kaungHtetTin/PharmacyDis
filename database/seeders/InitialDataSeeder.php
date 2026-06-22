<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Support\InvoicePrintSettings;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InitialDataSeeder extends Seeder
{
    public function run(): void
    {
        $roles = $this->seedRoles();

        $this->seedSuperAdmin($roles['super_admin']);
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

    private function seedSuperAdmin(Role $role): void
    {
        $user = User::withTrashed()->firstOrNew(['email' => 'admin@pharmacy.test']);
        $isNew = ! $user->exists;

        $user->forceFill([
            'role_id' => $role->id,
            'name' => $user->name ?: 'Office Super Admin',
            'phone' => $user->phone ?: '09-400-000001',
            'user_type' => 'office',
            'status' => 'active',
            'password' => $isNew ? Hash::make('password') : $user->password,
        ])->save();

        if (method_exists($user, 'restore') && $user->trashed()) {
            $user->restore();
        }
    }

    private function seedSettings(): void
    {
        Setting::firstOrCreate(
            ['key' => 'invoice_due_days'],
            ['setting_group' => 'finance', 'value' => '30', 'value_type' => 'integer']
        );

        foreach (InvoicePrintSettings::payload() as $setting) {
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                [
                    'setting_group' => InvoicePrintSettings::GROUP,
                    'value' => $setting['default_value'],
                    'value_type' => $setting['value_type'],
                ]
            );
        }
    }
}
