<?php

namespace App\Services;

use App\Models\StockBatch;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockMovementService
{
    public function availableBaseQuantity(int $companyId, int $productId): int
    {
        return (int) StockBatch::query()
            ->where('company_id', $companyId)
            ->where('product_id', $productId)
            ->sum('available_base_quantity');
    }

    public function assertAvailable(int $companyId, int $productId, int $baseUnitQuantity): void
    {
        if ($this->availableBaseQuantity($companyId, $productId) < $baseUnitQuantity) {
            throw ValidationException::withMessages([
                'items' => 'Available stock is not enough for one or more selected products.',
            ]);
        }
    }

    public function move(array $attributes): StockMovement
    {
        return StockMovement::create($attributes);
    }

    public function reserve(int $companyId, int $productId, int $baseUnitQuantity, string $referenceType, int $referenceId, ?int $userId = null): void
    {
        DB::transaction(function () use ($companyId, $productId, $baseUnitQuantity, $referenceType, $referenceId, $userId) {
            $remaining = $baseUnitQuantity;
            $batches = StockBatch::query()
                ->where('company_id', $companyId)
                ->where('product_id', $productId)
                ->where('available_base_quantity', '>', 0)
                ->orderBy('expiry_date')
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
                    'items' => 'Available stock is not enough for reservation.',
                ]);
            }
        });
    }
}
