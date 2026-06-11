<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function current(Request $request)
    {
        return StockBatch::query()
            ->select([
                'company_id',
                'warehouse_id',
                'product_id',
                DB::raw('SUM(available_base_quantity) as available_base_quantity'),
                DB::raw('SUM(reserved_base_quantity) as reserved_base_quantity'),
                DB::raw('SUM(sold_base_quantity) as sold_base_quantity'),
                DB::raw('MIN(expiry_date) as nearest_expiry_date'),
            ])
            ->with(['product:id,name,sku,base_unit_id', 'product.baseUnit:id,name,abbreviation'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->warehouse_id))
            ->when($request->filled('product_id'), fn ($query) => $query->where('product_id', $request->product_id))
            ->groupBy('company_id', 'warehouse_id', 'product_id')
            ->paginate($request->integer('per_page', 15));
    }
}
