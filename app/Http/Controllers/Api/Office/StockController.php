<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockAdjustmentRequest;
use App\Http\Requests\StoreStockTransferRequest;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Services\NumberGeneratorService;
use App\Services\ProductUnitConversionService;
use App\Services\StockTransferService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockController extends Controller
{
    public function transfers(Request $request)
    {
        return StockTransfer::query()
            ->with([
                'company',
                'sourceWarehouse',
                'destinationWarehouse',
                'movements' => fn ($query) => $query->where('base_unit_quantity', '<', 0),
                'movements.product.baseUnit',
                'movements.stockBatch',
            ])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('source_warehouse_id'), fn ($query) => $query->where('source_warehouse_id', $request->source_warehouse_id))
            ->when($request->filled('destination_warehouse_id'), fn ($query) => $query->where('destination_warehouse_id', $request->destination_warehouse_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery->where('transfer_no', 'like', "%{$search}%")
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('sourceWarehouse', fn ($warehouseQuery) => $warehouseQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('destinationWarehouse', fn ($warehouseQuery) => $warehouseQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function transferDetail(StockTransfer $stockTransfer)
    {
        return $stockTransfer->load([
            'company',
            'sourceWarehouse',
            'destinationWarehouse',
            'movements.product.baseUnit',
            'movements.stockBatch',
            'movements.warehouse',
        ]);
    }

    public function current(Request $request)
    {
        $query = StockBatch::query()
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
                DB::raw('SUM(stock_batches.reserved_base_quantity) as reserved_base_quantity'),
                DB::raw('SUM(stock_batches.sold_base_quantity) as sold_base_quantity'),
                DB::raw('SUM(stock_batches.available_base_quantity * COALESCE(batch_costs.base_unit_cost, 0)) as stock_value_amount'),
                DB::raw('MIN(stock_batches.expiry_date) as nearest_expiry_date'),
            ])
            ->with(['product:id,name,sku,base_unit_id,low_stock_threshold_base_units', 'product.baseUnit:id,name,abbreviation', 'product.productUnits.unit:id,name,abbreviation'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('stock_batches.company_id', $request->company_id))
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('stock_batches.warehouse_id', $request->warehouse_id))
            ->when($request->filled('product_id'), fn ($query) => $query->where('stock_batches.product_id', $request->product_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->whereHas('product', function ($productQuery) use ($search) {
                    $productQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
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

        if ($request->boolean('action_only')) {
            $query->havingRaw('SUM(stock_batches.available_base_quantity) <= COALESCE((select low_stock_threshold_base_units from products where products.id = stock_batches.product_id), 0)');
        }

        match ($request->input('status')) {
            'available' => $query->havingRaw('SUM(stock_batches.available_base_quantity) > 0'),
            'low_stock' => $query->havingRaw('SUM(stock_batches.available_base_quantity) <= COALESCE((select low_stock_threshold_base_units from products where products.id = stock_batches.product_id), 0)'),
            'near_expiry' => $query->havingRaw('MIN(stock_batches.expiry_date) between ? and ?', [now()->toDateString(), now()->addDays(90)->toDateString()]),
            'expired' => $query->havingRaw('MIN(stock_batches.expiry_date) < ?', [now()->toDateString()]),
            default => null,
        };

        $summary = DB::query()
            ->fromSub((clone $query)->toBase(), 'stock_summary')
            ->selectRaw('
                COUNT(*) as stock_row_count,
                COALESCE(SUM(available_base_quantity), 0) as available_base_quantity,
                COALESCE(SUM(reserved_base_quantity), 0) as reserved_base_quantity,
                COALESCE(SUM(sold_base_quantity), 0) as sold_base_quantity,
                COALESCE(SUM(stock_value_amount), 0) as stock_value_amount
            ')
            ->first();
        $paginated = $query->paginate($request->integer('per_page', 15));

        return response()->json(array_merge($paginated->toArray(), [
            'summary' => [
                'stock_row_count' => (int) ($summary->stock_row_count ?? 0),
                'available_base_quantity' => (int) ($summary->available_base_quantity ?? 0),
                'reserved_base_quantity' => (int) ($summary->reserved_base_quantity ?? 0),
                'sold_base_quantity' => (int) ($summary->sold_base_quantity ?? 0),
                'stock_value_amount' => (float) ($summary->stock_value_amount ?? 0),
            ],
        ]));
    }

    public function productBatches(Request $request, $product)
    {
        $product = Product::withTrashed()->findOrFail($product);

        $query = StockBatch::query()
            ->leftJoinSub($this->receiptBatchCostSubquery(), 'batch_costs', function ($join) {
                $join->on('batch_costs.company_id', '=', 'stock_batches.company_id')
                    ->on('batch_costs.product_id', '=', 'stock_batches.product_id')
                    ->whereRaw("batch_costs.batch_key = COALESCE(stock_batches.batch_no, '')")
                    ->whereRaw("batch_costs.expiry_key = COALESCE(stock_batches.expiry_date, '1000-01-01')");
            })
            ->select([
                'stock_batches.*',
                DB::raw('COALESCE(batch_costs.base_unit_cost, 0) as base_unit_cost_amount'),
                DB::raw('stock_batches.available_base_quantity * COALESCE(batch_costs.base_unit_cost, 0) as stock_value_amount'),
            ])
            ->with(['warehouse:id,name,code'])
            ->where('stock_batches.company_id', $product->company_id)
            ->where('stock_batches.product_id', $product->id)
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('stock_batches.warehouse_id', $request->warehouse_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where('stock_batches.batch_no', 'like', "%{$search}%");
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                match ($request->input('status')) {
                    'available' => $query->where('stock_batches.available_base_quantity', '>', 0),
                    'reserved' => $query->where('stock_batches.reserved_base_quantity', '>', 0),
                    'sold' => $query->where('stock_batches.sold_base_quantity', '>', 0),
                    'damaged' => $query->where('stock_batches.damaged_base_quantity', '>', 0),
                    'expired' => $query->where(function ($query) {
                        $query->where('stock_batches.expired_base_quantity', '>', 0)
                            ->orWhere('stock_batches.expiry_date', '<', now()->toDateString());
                    }),
                    'near_expiry' => $query->whereBetween('stock_batches.expiry_date', [now()->toDateString(), now()->addDays(90)->toDateString()]),
                    default => null,
                };
            })
            ->orderByRaw('stock_batches.expiry_date is null')
            ->orderBy('stock_batches.expiry_date')
            ->orderBy('stock_batches.id');

        $summaryQuery = StockBatch::query()
            ->where('stock_batches.company_id', $product->company_id)
            ->where('stock_batches.product_id', $product->id)
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('stock_batches.warehouse_id', $request->warehouse_id));

        $summary = (clone $summaryQuery)
            ->selectRaw('
                COALESCE(SUM(received_base_quantity), 0) as received_base_quantity,
                COALESCE(SUM(available_base_quantity), 0) as available_base_quantity,
                COALESCE(SUM(reserved_base_quantity), 0) as reserved_base_quantity,
                COALESCE(SUM(sold_base_quantity), 0) as sold_base_quantity,
                COALESCE(SUM(damaged_base_quantity), 0) as damaged_base_quantity,
                COALESCE(SUM(expired_base_quantity), 0) as expired_base_quantity,
                MIN(expiry_date) as nearest_expiry_date
            ')
            ->first();
        $stockValue = (float) (clone $summaryQuery)
            ->leftJoinSub($this->receiptBatchCostSubquery(), 'batch_costs', function ($join) {
                $join->on('batch_costs.company_id', '=', 'stock_batches.company_id')
                    ->on('batch_costs.product_id', '=', 'stock_batches.product_id')
                    ->whereRaw("batch_costs.batch_key = COALESCE(stock_batches.batch_no, '')")
                    ->whereRaw("batch_costs.expiry_key = COALESCE(stock_batches.expiry_date, '1000-01-01')");
            })
            ->sum(DB::raw('stock_batches.available_base_quantity * COALESCE(batch_costs.base_unit_cost, 0)'));

        $paginated = $query->paginate($request->integer('per_page', 15));
        $paginated->getCollection()->load(['product:id,name,sku,base_unit_id', 'product.baseUnit:id,name,abbreviation']);

        return response()->json(array_merge($paginated->toArray(), [
            'product' => $product->load('baseUnit:id,name,abbreviation'),
            'summary' => [
                'batch_count' => (clone $summaryQuery)->count(),
                'received_base_quantity' => (int) ($summary->received_base_quantity ?? 0),
                'available_base_quantity' => (int) ($summary->available_base_quantity ?? 0),
                'reserved_base_quantity' => (int) ($summary->reserved_base_quantity ?? 0),
                'sold_base_quantity' => (int) ($summary->sold_base_quantity ?? 0),
                'damaged_base_quantity' => (int) ($summary->damaged_base_quantity ?? 0),
                'expired_base_quantity' => (int) ($summary->expired_base_quantity ?? 0),
                'stock_value_amount' => $stockValue,
                'nearest_expiry_date' => $summary->nearest_expiry_date ?? null,
            ],
        ]));
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

    public function adjust(
        StoreStockAdjustmentRequest $request,
        ProductUnitConversionService $conversionService,
        NumberGeneratorService $numberGeneratorService
    ) {
        $data = $request->validated();

        return DB::transaction(function () use ($data, $request, $conversionService, $numberGeneratorService) {
            $product = Product::query()
                ->where('company_id', $data['company_id'])
                ->findOrFail($data['product_id']);
            $baseQuantity = $conversionService->toBaseQuantity($product, (int) $data['unit_id'], (int) $data['quantity']);
            $adjustment = StockAdjustment::create([
                'adjustment_no' => $numberGeneratorService->next(StockAdjustment::class, 'adjustment_no', 'ADJ'),
                'company_id' => $data['company_id'],
                'warehouse_id' => $data['warehouse_id'],
                'product_id' => $product->id,
                'adjustment_type' => $data['adjustment_type'],
                'base_unit_quantity' => $baseQuantity,
                'reason' => $data['reason'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            if ($data['adjustment_type'] === 'increase') {
                $batchNo = ($data['batch_no'] ?? null) ?: $adjustment->adjustment_no;
                $batch = StockBatch::query()->firstOrCreate([
                    'company_id' => $data['company_id'],
                    'warehouse_id' => $data['warehouse_id'],
                    'product_id' => $product->id,
                    'batch_no' => $batchNo,
                    'expiry_date' => $data['expiry_date'] ?? null,
                ], [
                    'received_base_quantity' => 0,
                    'available_base_quantity' => 0,
                ]);

                $batch->increment('received_base_quantity', $baseQuantity);
                $batch->increment('available_base_quantity', $baseQuantity);
                $adjustment->update(['stock_batch_id' => $batch->id]);

                StockMovement::create([
                    'company_id' => $data['company_id'],
                    'warehouse_id' => $data['warehouse_id'],
                    'product_id' => $product->id,
                    'stock_batch_id' => $batch->id,
                    'movement_type' => 'adjustment',
                    'base_unit_quantity' => $baseQuantity,
                    'reference_type' => StockAdjustment::class,
                    'reference_id' => $adjustment->id,
                    'note' => $data['reason'] ?? null,
                    'created_by' => $request->user()?->id,
                ]);

                return $adjustment->load(['product.baseUnit', 'stockBatch']);
            }

            $this->consumeStockForAdjustment($adjustment, $data, $product, $baseQuantity, $request->user()?->id);

            return $adjustment->load(['product.baseUnit', 'stockBatch']);
        });
    }

    public function transfer(StoreStockTransferRequest $request, StockTransferService $transferService)
    {
        $transfer = $transferService->transfer($request->validated(), $request->user());

        return response()->json($transfer, 201);
    }

    private function consumeStockForAdjustment(StockAdjustment $adjustment, array $data, Product $product, int $baseQuantity, ?int $userId): void
    {
        $available = StockBatch::query()
            ->where('company_id', $data['company_id'])
            ->where('warehouse_id', $data['warehouse_id'])
            ->where('product_id', $product->id)
            ->sum('available_base_quantity');

        if ($available < $baseQuantity) {
            throw ValidationException::withMessages([
                'quantity' => 'Not enough available stock for this adjustment.',
            ]);
        }

        $remaining = $baseQuantity;
        $movementType = match ($data['adjustment_type']) {
            'damage' => 'damage',
            'expiry' => 'expiry',
            default => 'adjustment',
        };

        StockBatch::query()
            ->where('company_id', $data['company_id'])
            ->where('warehouse_id', $data['warehouse_id'])
            ->where('product_id', $product->id)
            ->where('available_base_quantity', '>', 0)
            ->orderBy('expiry_date')
            ->orderBy('id')
            ->get()
            ->each(function (StockBatch $batch) use (&$remaining, $adjustment, $data, $product, $movementType, $userId) {
                if ($remaining <= 0) {
                    return false;
                }

                $deducted = min($remaining, $batch->available_base_quantity);
                $batch->decrement('available_base_quantity', $deducted);

                if ($data['adjustment_type'] === 'damage') {
                    $batch->increment('damaged_base_quantity', $deducted);
                }

                if ($data['adjustment_type'] === 'expiry') {
                    $batch->increment('expired_base_quantity', $deducted);
                }

                if (! $adjustment->stock_batch_id) {
                    $adjustment->update(['stock_batch_id' => $batch->id]);
                }

                StockMovement::create([
                    'company_id' => $data['company_id'],
                    'warehouse_id' => $data['warehouse_id'],
                    'product_id' => $product->id,
                    'stock_batch_id' => $batch->id,
                    'movement_type' => $movementType,
                    'base_unit_quantity' => -$deducted,
                    'reference_type' => StockAdjustment::class,
                    'reference_id' => $adjustment->id,
                    'note' => $data['reason'] ?? null,
                    'created_by' => $userId,
                ]);

                $remaining -= $deducted;
            });
    }
}
