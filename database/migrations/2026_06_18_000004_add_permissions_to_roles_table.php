<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $permissionSets = [
        'super_admin' => ['*'],
        'admin' => ['*'],
        'office_operator' => ['office.dashboard', 'office.operations', 'office.master-data'],
        'finance_manager' => ['office.dashboard', 'office.finance', 'office.reports'],
        'inventory_manager' => ['office.dashboard', 'office.operations', 'office.master-data'],
        'sales_representative' => ['sales.app'],
    ];

    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (! Schema::hasColumn('roles', 'permissions')) {
                $table->json('permissions')->nullable()->after('description');
            }
        });

        foreach ($this->permissionSets as $roleName => $permissions) {
            DB::table('roles')
                ->where('name', $roleName)
                ->update(['permissions' => json_encode($permissions)]);
        }

        $this->createOfficeRole('office_operator', 'Office Operator', 'Daily order, customer, product, and stock operation access.');
        $this->createOfficeRole('finance_manager', 'Finance Manager', 'Finance ledger, payment, payable, receivable, and report access.');
        $this->createOfficeRole('inventory_manager', 'Inventory Manager', 'Inventory, receiving, warehouse, product, and transfer access.');
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (Schema::hasColumn('roles', 'permissions')) {
                $table->dropColumn('permissions');
            }
        });
    }

    private function createOfficeRole(string $name, string $displayName, string $description): void
    {
        DB::table('roles')->updateOrInsert(
            ['name' => $name],
            [
                'display_name' => $displayName,
                'description' => $description,
                'permissions' => json_encode($this->permissionSets[$name]),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }
};
