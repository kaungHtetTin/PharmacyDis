<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\SalesRepresentative;
use App\Models\StockBatch;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LookupController extends Controller
{
    public function companies()
    {
        return Company::query()
            ->withCount('products')
            ->where('status', 'active')
            ->orderBy('name')
            ->get();
    }

    public function customers(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $limit = min(max((int) $request->query('limit', 50), 10), 100);
        $selectedId = $request->integer('selected_id') ?: null;
        $searchOnly = $request->boolean('search_only');

        $customers = collect();

        if (! $searchOnly || $search !== '') {
            $customers = Customer::query()
                ->with(['creditStatuses.company'])
                ->when($search !== '', function ($query) use ($search) {
                    $query->where(function ($searchQuery) use ($search) {
                        $searchQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%")
                            ->orWhere('owner_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('township', 'like', "%{$search}%")
                            ->orWhere('city', 'like', "%{$search}%");
                    });
                })
                ->where('status', 'active')
                ->orderBy('name')
                ->limit($limit)
                ->get();
        }

        if ($selectedId && ! $customers->contains(fn ($customer) => (int) $customer->id === $selectedId)) {
            $selectedCustomer = Customer::query()
                ->with(['creditStatuses.company'])
                ->whereKey($selectedId)
                ->where('status', 'active')
                ->first();

            if ($selectedCustomer) {
                $customers = collect([$selectedCustomer])
                    ->merge($customers->reject(fn ($customer) => (int) $customer->id === $selectedId))
                    ->values();
            }
        }

        return $customers;
    }

    public function products(Request $request)
    {
        $salesRepresentative = $request->user()?->user_type === 'sales'
            ? $request->user()->salesRepresentative
            : null;
        $ids = collect(explode(',', (string) $request->query('ids', '')))
            ->map(fn ($id) => (int) trim($id))
            ->filter()
            ->unique()
            ->values();
        $search = trim((string) $request->query('search', ''));
        $limit = min(max((int) $request->query('limit', 500), 50), 1000);

        if ($request->boolean('lightweight')) {
            $stockSummary = StockBatch::query()
                ->select([
                    'company_id',
                    'product_id',
                    DB::raw('SUM(available_base_quantity) as available_base_quantity'),
                ])
                ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->integer('warehouse_id')))
                ->groupBy('company_id', 'product_id');

            return Product::query()
                ->select([
                    'products.id',
                    'products.company_id',
                    'products.name',
                    'products.sku',
                    'products.barcode',
                    DB::raw('COALESCE(stock_summary.available_base_quantity, 0) as available_base_quantity'),
                ])
                ->leftJoinSub($stockSummary, 'stock_summary', function ($join) {
                    $join->on('stock_summary.product_id', '=', 'products.id')
                        ->on('stock_summary.company_id', '=', 'products.company_id');
                })
                ->with(['baseUnit:id,name,abbreviation'])
                ->when($salesRepresentative, fn ($query) => $query->where('products.company_id', $salesRepresentative->company_id))
                ->when($request->filled('company_id'), fn ($query) => $query->where('products.company_id', $request->company_id))
                ->when($search !== '', function ($query) use ($search) {
                    $query->where(function ($query) use ($search) {
                        $query->where('products.name', 'like', "%{$search}%")
                            ->orWhere('products.sku', 'like', "%{$search}%")
                            ->orWhere('products.barcode', 'like', "%{$search}%")
                            ->orWhere('products.brand', 'like', "%{$search}%");
                    });
                })
                ->where('products.status', 'active')
                ->orderBy('products.name')
                ->limit($limit)
                ->get();
        }

        return Product::query()
            ->with(['company', 'category', 'baseUnit', 'productUnits.unit', 'focRules' => fn ($query) => $query->where('status', 'active')])
            ->when($ids->isNotEmpty(), fn ($query) => $query->whereIn('products.id', $ids))
            ->when($salesRepresentative, fn ($query) => $query->where('products.company_id', $salesRepresentative->company_id))
            ->when($request->filled('company_id'), fn ($query) => $query->where('products.company_id', $request->company_id))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('products.name', 'like', "%{$search}%")
                        ->orWhere('products.sku', 'like', "%{$search}%")
                        ->orWhere('products.barcode', 'like', "%{$search}%")
                        ->orWhere('products.brand', 'like', "%{$search}%");
                });
            })
            ->where('products.status', 'active')
            ->orderBy('products.name')
            ->when($ids->isEmpty(), fn ($query) => $query->limit($limit))
            ->get();
    }

    public function salesRepresentatives(Request $request)
    {
        return SalesRepresentative::query()
            ->with(['company', 'user:id,name,email,phone'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->where('status', 'active')
            ->orderBy('employee_code')
            ->get();
    }

    public function units()
    {
        return Unit::where('status', 'active')->orderBy('name')->get();
    }

    public function productCategories()
    {
        return ProductCategory::where('status', 'active')->orderBy('name')->get();
    }

    public function brands(Request $request)
    {
        return Brand::query()
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->where('status', 'active')
            ->orderBy('name')
            ->get();
    }
}
