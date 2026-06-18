<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function current(Request $request)
    {
        $salesRepresentative = $request->user()->salesRepresentative;
        $companyId = $salesRepresentative?->company_id;
        $stockSummary = StockBatch::query()
            ->select([
                'company_id',
                'product_id',
                DB::raw('SUM(available_base_quantity) as available_base_quantity'),
                DB::raw('SUM(reserved_base_quantity) as reserved_base_quantity'),
                DB::raw('SUM(sold_base_quantity) as sold_base_quantity'),
                DB::raw('MIN(expiry_date) as nearest_expiry_date'),
            ])
            ->where('company_id', $companyId)
            ->groupBy('company_id', 'product_id');

        $query = Product::query()
            ->select([
                DB::raw('products.id as id'),
                DB::raw('products.company_id as company_id'),
                DB::raw('products.id as product_id'),
                'products.name',
                'products.sku',
                'products.base_unit_id',
                'products.low_stock_threshold_base_units',
                DB::raw('COALESCE(stock_summary.available_base_quantity, 0) as available_base_quantity'),
                DB::raw('COALESCE(stock_summary.reserved_base_quantity, 0) as reserved_base_quantity'),
                DB::raw('COALESCE(stock_summary.sold_base_quantity, 0) as sold_base_quantity'),
                DB::raw('stock_summary.nearest_expiry_date as nearest_expiry_date'),
            ])
            ->leftJoinSub($stockSummary, 'stock_summary', function ($join) {
                $join->on('stock_summary.product_id', '=', 'products.id')
                    ->on('stock_summary.company_id', '=', 'products.company_id');
            })
            ->with(['baseUnit:id,name,abbreviation'])
            ->where('products.company_id', $companyId)
            ->where('products.status', 'active')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery->where('products.name', 'like', "%{$search}%")
                        ->orWhere('products.sku', 'like', "%{$search}%");
                });
            });

        match ($request->input('status')) {
            'available' => $query->whereRaw('COALESCE(stock_summary.available_base_quantity, 0) > 0'),
            'low_stock' => $query->whereRaw('COALESCE(stock_summary.available_base_quantity, 0) <= products.low_stock_threshold_base_units'),
            'near_expiry' => $query->whereBetween('stock_summary.nearest_expiry_date', [now()->toDateString(), now()->addDays(90)->toDateString()]),
            default => null,
        };

        return $query
            ->orderBy('products.name')
            ->paginate($request->integer('per_page', 15))
            ->through(fn ($product) => [
                'company_id' => (int) $product->company_id,
                'product_id' => (int) $product->product_id,
                'available_base_quantity' => (int) $product->available_base_quantity,
                'reserved_base_quantity' => (int) $product->reserved_base_quantity,
                'sold_base_quantity' => (int) $product->sold_base_quantity,
                'nearest_expiry_date' => $product->nearest_expiry_date,
                'product' => [
                    'id' => (int) $product->product_id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'base_unit_id' => $product->base_unit_id,
                    'low_stock_threshold_base_units' => (int) $product->low_stock_threshold_base_units,
                    'base_unit' => $product->baseUnit,
                ],
            ]);
    }
}
