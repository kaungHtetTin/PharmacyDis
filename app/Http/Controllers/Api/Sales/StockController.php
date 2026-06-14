<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function current(Request $request)
    {
        $salesRepresentative = $request->user()->salesRepresentative;

        $query = StockBatch::query()
            ->select([
                'company_id',
                'product_id',
                DB::raw('SUM(available_base_quantity) as available_base_quantity'),
                DB::raw('SUM(reserved_base_quantity) as reserved_base_quantity'),
                DB::raw('SUM(sold_base_quantity) as sold_base_quantity'),
                DB::raw('MIN(expiry_date) as nearest_expiry_date'),
            ])
            ->with(['product:id,name,sku,base_unit_id,low_stock_threshold_base_units', 'product.baseUnit:id,name,abbreviation'])
            ->where('company_id', $salesRepresentative?->company_id)
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->whereHas('product', function ($productQuery) use ($search) {
                    $productQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->groupBy('company_id', 'product_id');

        match ($request->input('status')) {
            'available' => $query->havingRaw('SUM(available_base_quantity) > 0'),
            'low_stock' => $query->havingRaw('SUM(available_base_quantity) <= COALESCE((select low_stock_threshold_base_units from products where products.id = stock_batches.product_id), 0)'),
            'near_expiry' => $query->havingRaw('MIN(expiry_date) between ? and ?', [now()->toDateString(), now()->addDays(90)->toDateString()]),
            default => null,
        };

        return $query->paginate($request->integer('per_page', 15));
    }
}
