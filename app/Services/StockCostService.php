<?php

namespace App\Services;

use App\Models\SalesOrder;
use App\Models\SalesReturn;
use App\Models\StockBatch;
use App\Models\StockMovement;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class StockCostService
{
    public function effectiveBatchCost(StockBatch $batch): ?float
    {
        if ($batch->base_unit_cost !== null) {
            return (float) $batch->base_unit_cost;
        }

        return $this->receiptBatchCost(
            (int) $batch->company_id,
            (int) $batch->product_id,
            $batch->batch_no,
            $batch->expiry_date?->toDateString()
        );
    }

    public function receiptBatchCost(int $companyId, int $productId, ?string $batchNo, ?string $expiryDate): ?float
    {
        $totals = DB::table('stock_receipt_items')
            ->join('stock_receipts', 'stock_receipts.id', '=', 'stock_receipt_items.stock_receipt_id')
            ->whereNull('stock_receipts.deleted_at')
            ->where('stock_receipts.company_id', $companyId)
            ->where('stock_receipt_items.product_id', $productId)
            ->whereRaw("COALESCE(stock_receipt_items.batch_no, '') = ?", [$batchNo ?? ''])
            ->whereRaw("COALESCE(stock_receipt_items.expiry_date, '1000-01-01') = ?", [$expiryDate ?? '1000-01-01'])
            ->selectRaw('SUM(stock_receipt_items.line_total) as total_cost, SUM(stock_receipt_items.base_unit_quantity) as total_quantity')
            ->first();

        if (! $totals || (int) $totals->total_quantity <= 0) {
            return null;
        }

        return round((float) $totals->total_cost / (int) $totals->total_quantity, 6);
    }

    public function latestReceiptCost(int $companyId, int $productId, CarbonInterface|string|null $asOf = null): ?float
    {
        $item = DB::table('stock_receipt_items')
            ->join('stock_receipts', 'stock_receipts.id', '=', 'stock_receipt_items.stock_receipt_id')
            ->whereNull('stock_receipts.deleted_at')
            ->where('stock_receipts.company_id', $companyId)
            ->where('stock_receipt_items.product_id', $productId)
            ->where('stock_receipt_items.base_unit_quantity', '>', 0)
            ->when($asOf, fn ($query) => $query->whereDate('stock_receipts.received_date', '<=', $asOf))
            ->orderByDesc('stock_receipts.received_date')
            ->orderByDesc('stock_receipt_items.id')
            ->select(['stock_receipt_items.line_total', 'stock_receipt_items.base_unit_quantity'])
            ->first();

        if (! $item) {
            return null;
        }

        return round((float) $item->line_total / (int) $item->base_unit_quantity, 6);
    }

    public function salesOrderProductCost(?int $salesOrderId, int $productId): ?float
    {
        if (! $salesOrderId) {
            return null;
        }

        $movements = StockMovement::query()
            ->with('stockBatch')
            ->where('reference_type', SalesOrder::class)
            ->where('reference_id', $salesOrderId)
            ->where('product_id', $productId)
            ->where('movement_type', 'sale')
            ->whereNotNull('stock_batch_id')
            ->orderBy('id')
            ->get();

        $costedQuantity = 0;
        $totalCost = 0.0;

        foreach ($movements as $movement) {
            if (! $movement->stockBatch) {
                continue;
            }

            $cost = $this->effectiveBatchCost($movement->stockBatch);

            if ($cost === null) {
                continue;
            }

            $quantity = abs((int) $movement->base_unit_quantity);
            $costedQuantity += $quantity;
            $totalCost += $quantity * $cost;
        }

        return $costedQuantity > 0 ? round($totalCost / $costedQuantity, 6) : null;
    }

    public function applyIncomingCost(StockBatch $batch, int $incomingQuantity, ?float $incomingCost, string $source): void
    {
        if ($incomingCost === null || $incomingQuantity <= 0) {
            return;
        }

        $currentCost = $this->effectiveBatchCost($batch);
        $currentOnHand = (int) $batch->available_base_quantity + (int) $batch->reserved_base_quantity;
        $newCost = $incomingCost;

        if ($currentCost !== null && $currentOnHand > 0) {
            $newCost = (($currentOnHand * $currentCost) + ($incomingQuantity * $incomingCost))
                / ($currentOnHand + $incomingQuantity);
        }

        $batch->update([
            'base_unit_cost' => round($newCost, 6),
            'cost_source' => $source,
        ]);
    }

    public function historicalBatchCost(StockBatch $batch): array
    {
        $receiptCost = $this->receiptBatchCost(
            (int) $batch->company_id,
            (int) $batch->product_id,
            $batch->batch_no,
            $batch->expiry_date?->toDateString()
        );

        if ($receiptCost !== null) {
            return [$receiptCost, 'receipt_backfill'];
        }

        $movement = StockMovement::query()
            ->where('stock_batch_id', $batch->id)
            ->where('base_unit_quantity', '>', 0)
            ->orderBy('id')
            ->first();

        if ($movement?->movement_type === 'transfer' && $movement->reference_id) {
            $sourceMovement = StockMovement::query()
                ->with('stockBatch')
                ->where('reference_type', $movement->reference_type)
                ->where('reference_id', $movement->reference_id)
                ->where('product_id', $batch->product_id)
                ->where('base_unit_quantity', '<', 0)
                ->whereNotNull('stock_batch_id')
                ->first();
            $sourceCost = $sourceMovement?->stockBatch
                ? $this->effectiveBatchCost($sourceMovement->stockBatch)
                : null;

            if ($sourceCost !== null) {
                return [$sourceCost, 'transfer_backfill'];
            }
        }

        if ($movement?->movement_type === 'return' && $movement->reference_id) {
            $salesReturn = SalesReturn::query()->find($movement->reference_id);
            $returnCost = $this->salesOrderProductCost($salesReturn?->sales_order_id, (int) $batch->product_id);

            if ($returnCost !== null) {
                return [$returnCost, 'original_sale_return_backfill'];
            }
        }

        $latestCost = $this->latestReceiptCost(
            (int) $batch->company_id,
            (int) $batch->product_id,
            $batch->created_at
        );

        return $latestCost !== null
            ? [$latestCost, 'latest_receipt_estimate']
            : [null, null];
    }
}
