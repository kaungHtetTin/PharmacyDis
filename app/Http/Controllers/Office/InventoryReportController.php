<?php

namespace App\Http\Controllers\Office;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\StockBatch;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryReportController extends Controller
{
    public function __invoke(Request $request)
    {
        $query = StockBatch::query()
            ->join('companies', 'companies.id', '=', 'stock_batches.company_id')
            ->join('products', 'products.id', '=', 'stock_batches.product_id')
            ->leftJoinSub($this->receiptBatchCostSubquery(), 'batch_costs', function ($join) {
                $join->on('batch_costs.company_id', '=', 'stock_batches.company_id')
                    ->on('batch_costs.product_id', '=', 'stock_batches.product_id')
                    ->whereRaw("batch_costs.batch_key = COALESCE(stock_batches.batch_no, '')")
                    ->whereRaw("batch_costs.expiry_key = COALESCE(stock_batches.expiry_date, '1000-01-01')");
            })
            ->select([
                'stock_batches.company_id',
                $request->filled('warehouse_id') ? 'stock_batches.warehouse_id' : DB::raw('NULL as warehouse_id'),
                'stock_batches.product_id',
                DB::raw('SUM(stock_batches.available_base_quantity) as available_base_quantity'),
                DB::raw('SUM(stock_batches.available_base_quantity * COALESCE(batch_costs.base_unit_cost, 0)) as stock_value_amount'),
                DB::raw('MIN(stock_batches.expiry_date) as nearest_expiry_date'),
            ])
            ->with(['company:id,name', 'product:id,name,sku,base_unit_id,low_stock_threshold_base_units', 'product.baseUnit:id,name,abbreviation', 'product.productUnits.unit:id,name,abbreviation'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('stock_batches.company_id', $request->company_id))
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('stock_batches.warehouse_id', $request->warehouse_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->query('search'));

                $query->where(function ($query) use ($search) {
                    $query->where('products.name', 'like', "%{$search}%")
                        ->orWhere('products.sku', 'like', "%{$search}%");
                });
            })
            ->groupBy(...array_filter([
                'stock_batches.company_id',
                $request->filled('warehouse_id') ? 'stock_batches.warehouse_id' : null,
                'stock_batches.product_id',
            ]));

        $query->havingRaw('SUM(stock_batches.available_base_quantity) > 0 OR EXISTS (
            select 1 from products
            where products.id = stock_batches.product_id
            and products.deleted_at is null
        )');

        match ($request->input('status')) {
            'available' => $query->havingRaw('SUM(stock_batches.available_base_quantity) > 0'),
            'low_stock' => $query->havingRaw('SUM(stock_batches.available_base_quantity) <= COALESCE((select low_stock_threshold_base_units from products where products.id = stock_batches.product_id), 0)'),
            'near_expiry' => $query->havingRaw('MIN(stock_batches.expiry_date) between ? and ?', [now()->toDateString(), now()->addDays(90)->toDateString()]),
            'expired' => $query->havingRaw('MIN(stock_batches.expiry_date) < ?', [now()->toDateString()]),
            default => null,
        };

        $rows = $query
            ->orderBy('companies.name')
            ->orderBy('products.name')
            ->get();

        $filterCompany = $request->filled('company_id')
            ? Company::query()->select(['id', 'name'])->find($request->integer('company_id'))
            : null;
        $filterWarehouse = $request->filled('warehouse_id')
            ? Warehouse::query()->select(['id', 'name'])->find($request->integer('warehouse_id'))
            : null;

        return view('office.inventory.report', [
            'filterCompany' => $filterCompany,
            'filterWarehouse' => $filterWarehouse,
            'filters' => $request->only(['search', 'company_id', 'warehouse_id', 'status']),
            'rows' => $rows,
        ]);
    }

    private function receiptBatchCostSubquery()
    {
        return DB::table('stock_receipt_items')
            ->join('stock_receipts', 'stock_receipts.id', '=', 'stock_receipt_items.stock_receipt_id')
            ->whereNull('stock_receipts.deleted_at')
            ->selectRaw("
                stock_receipts.company_id,
                stock_receipt_items.product_id,
                COALESCE(stock_receipt_items.batch_no, '') as batch_key,
                COALESCE(stock_receipt_items.expiry_date, '1000-01-01') as expiry_key,
                COALESCE(SUM(stock_receipt_items.line_total) / NULLIF(SUM(stock_receipt_items.base_unit_quantity), 0), 0) as base_unit_cost
            ")
            ->groupBy(
                'stock_receipts.company_id',
                'stock_receipt_items.product_id',
                DB::raw("COALESCE(stock_receipt_items.batch_no, '')"),
                DB::raw("COALESCE(stock_receipt_items.expiry_date, '1000-01-01')")
            );
    }
}
