<?php

namespace App\Services;

use App\Models\StockBatch;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockMovementService
{
    public function availableBaseQuantity(int $companyId, int $productId, ?int $warehouseId = null): int
    {
        return (int) StockBatch::query()
            ->where('company_id', $companyId)
            ->where('product_id', $productId)
            ->when($warehouseId, fn ($query) => $query->where('warehouse_id', $warehouseId))
            ->sum('available_base_quantity');
    }

    public function assertAvailable(int $companyId, int $productId, int $baseUnitQuantity, ?int $warehouseId = null): void
    {
        if ($this->availableBaseQuantity($companyId, $productId, $warehouseId) < $baseUnitQuantity) {
            throw ValidationException::withMessages([
                'items' => 'Available stock is not enough for one or more selected products.',
            ]);
        }
    }

    public function move(array $attributes): StockMovement
    {
        return StockMovement::create($attributes);
    }

    public function reserve(int $companyId, int $productId, int $baseUnitQuantity, string $referenceType, int $referenceId, ?int $userId = null, ?int $warehouseId = null): void
    {
        DB::transaction(function () use ($companyId, $productId, $baseUnitQuantity, $referenceType, $referenceId, $userId, $warehouseId) {
            $remaining = $baseUnitQuantity;
            $batches = StockBatch::query()
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->when($warehouseId, fn ($query) => $query->where('warehouse_id', $warehouseId))
                ->where('available_base_quantity', '>', 0)
                ->orderByRaw('expiry_date is null')
                ->orderBy('expiry_date')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($batches as $batch) {
                if ($remaining <= 0) {
                    break;
                }

                $reserved = min($remaining, $batch->available_base_quantity);
                $batch->decrement('available_base_quantity', $reserved);
                $batch->increment('reserved_base_quantity', $reserved);
                $remaining -= $reserved;

                $this->move([
                    'company_id' => $companyId,
                    'warehouse_id' => $batch->warehouse_id,
                    'product_id' => $productId,
                    'stock_batch_id' => $batch->id,
                    'movement_type' => 'reserve',
                    'base_unit_quantity' => -$reserved,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'created_by' => $userId,
                ]);
            }

            if ($remaining > 0) {
                throw ValidationException::withMessages([
                    'items' => $warehouseId
                        ? 'Available stock is not enough in the selected warehouse for reservation.'
                        : 'Available stock is not enough for reservation.',
                ]);
            }
        });
    }

    public function releaseReserved(string $referenceType, int $referenceId, ?int $userId = null): void
    {
        DB::transaction(function () use ($referenceType, $referenceId, $userId) {
            $reservedByBatch = StockMovement::query()
                ->where('reference_type', $referenceType)
                ->where('reference_id', $referenceId)
                ->whereIn('movement_type', ['reserve', 'release'])
                ->whereNotNull('stock_batch_id')
                ->select(
                    'company_id',
                    'warehouse_id',
                    'product_id',
                    'stock_batch_id',
                    DB::raw("SUM(CASE WHEN movement_type = 'reserve' THEN ABS(base_unit_quantity) ELSE -ABS(base_unit_quantity) END) as reserved_quantity"),
                    DB::raw('MIN(id) as first_movement_id')
                )
                ->groupBy('company_id', 'warehouse_id', 'product_id', 'stock_batch_id')
                ->having('reserved_quantity', '>', 0)
                ->orderBy('first_movement_id')
                ->get();

            foreach ($reservedByBatch as $reservation) {
                $batch = StockBatch::query()
                    ->lockForUpdate()
                    ->find($reservation->stock_batch_id);

                if (! $batch) {
                    continue;
                }

                $quantity = min((int) $reservation->reserved_quantity, (int) $batch->reserved_base_quantity);

                if ($quantity <= 0) {
                    continue;
                }

                $batch->decrement('reserved_base_quantity', $quantity);
                $batch->increment('available_base_quantity', $quantity);

                $this->move([
                    'company_id' => $reservation->company_id,
                    'warehouse_id' => $reservation->warehouse_id,
                    'product_id' => $reservation->product_id,
                    'stock_batch_id' => $reservation->stock_batch_id,
                    'movement_type' => 'release',
                    'base_unit_quantity' => $quantity,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'created_by' => $userId,
                ]);
            }
        });
    }

    public function sellReserved(int $companyId, int $productId, int $baseUnitQuantity, string $referenceType, int $referenceId, ?int $userId = null): void
    {
        DB::transaction(function () use ($companyId, $productId, $baseUnitQuantity, $referenceType, $referenceId, $userId) {
            $remaining = $baseUnitQuantity;
            $reservedByBatch = StockMovement::query()
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->where('reference_type', $referenceType)
                ->where('reference_id', $referenceId)
                ->where('movement_type', 'reserve')
                ->whereNotNull('stock_batch_id')
                ->select('stock_batch_id', DB::raw('SUM(ABS(base_unit_quantity)) as reserved_quantity'), DB::raw('MIN(id) as first_movement_id'))
                ->groupBy('stock_batch_id')
                ->orderBy('first_movement_id')
                ->get();

            foreach ($reservedByBatch as $reservation) {
                if ($remaining <= 0) {
                    break;
                }

                $batch = StockBatch::query()
                    ->lockForUpdate()
                    ->find($reservation->stock_batch_id);

                if (! $batch) {
                    continue;
                }

                $reservedForBatch = (int) $reservation->reserved_quantity;
                $alreadySold = (int) StockMovement::query()
                    ->where('stock_batch_id', $batch->id)
                    ->where('company_id', $companyId)
                    ->where('product_id', $productId)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->where('movement_type', 'sale')
                    ->sum(DB::raw('ABS(base_unit_quantity)'));
                $remainingFromBatchReservation = max(0, $reservedForBatch - $alreadySold);
                $sold = min($remaining, $remainingFromBatchReservation, (int) $batch->reserved_base_quantity);

                if ($sold <= 0) {
                    continue;
                }

                $batch->decrement('reserved_base_quantity', $sold);
                $batch->increment('sold_base_quantity', $sold);
                $remaining -= $sold;

                $this->move([
                    'company_id' => $companyId,
                    'warehouse_id' => $batch->warehouse_id,
                    'product_id' => $productId,
                    'stock_batch_id' => $batch->id,
                    'movement_type' => 'sale',
                    'base_unit_quantity' => -$sold,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'created_by' => $userId,
                ]);
            }

            if ($remaining > 0) {
                throw ValidationException::withMessages([
                    'items' => 'Reserved stock is not enough for delivery.',
                ]);
            }
        });
    }
}
