<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\SalesRepresentative;
use App\Models\Unit;
use Illuminate\Http\Request;

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

        return Customer::query()
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

    public function products(Request $request)
    {
        $salesRepresentative = $request->user()?->user_type === 'sales'
            ? $request->user()->salesRepresentative
            : null;

        return Product::query()
            ->with(['company', 'category', 'baseUnit', 'productUnits.unit', 'focRules' => fn ($query) => $query->where('status', 'active')])
            ->when($salesRepresentative, fn ($query) => $query->where('company_id', $salesRepresentative->company_id))
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->where('status', 'active')
            ->orderBy('name')
            ->limit(50)
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
