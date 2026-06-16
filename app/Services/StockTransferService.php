<?php

namespace App\Services;

use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockTransferService
{
    public function __construct(
        private NumberGeneratorService $numberGeneratorService,
    ) {
    }

    public function transfer(array $data, ?User $actor = null): StockTransfer
    {
        return DB::transaction(function () use ($data, $actor) {
            $requestedItems = collect($data['items'])
                ->map(fn (array $item) => [
                    'stock_batch_id' => (int) $item['stock_batch_id'],
                    'base_unit_quantity' => (int) $item['base_unit_quantity'],
                ])
                ->groupBy('stock_batch_id')
                ->map(fn ($items, int $batchId) => [
                    'stock_batch_id' => $batchId,
                    'base_unit_quantity' => $items->sum('base_unit_quantity'),
                ])
                ->values();
            $baseQuantity = (int) $requestedItems->sum('base_unit_quantity');

            if ($baseQuantity <= 0) {
                throw ValidationException::withMessages([
                    'items' => 'Select at least one available batch quantity to transfer.',
                ]);
            }

            $sourceBatches = StockBatch::query()
                ->with('product')
                ->where('company_id', $data['company_id'])
                ->where('warehouse_id', $data['source_warehouse_id'])
                ->whereIn('id', $requestedItems->pluck('stock_batch_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($requestedItems as $index => $requestedItem) {
                $sourceBatch = $sourceBatches->get($requestedItem['stock_batch_id']);

                if (! $sourceBatch) {
                    throw ValidationException::withMessages([
                        "items.$index.stock_batch_id" => 'The selected batch is not available in the source warehouse for this product.',
                    ]);
                }

                if ((int) $sourceBatch->available_base_quantity < $requestedItem['base_unit_quantity']) {
                    throw ValidationException::withMessages([
                        "items.$index.base_unit_quantity" => 'Transfer quantity exceeds available stock for one or more selected batches.',
                    ]);
                }
            }

            $transfer = StockTransfer::create([
                'transfer_no' => $this->numberGeneratorService->next(StockTransfer::class, 'transfer_no', 'TRF'),
                'company_id' => $data['company_id'],
                'source_warehouse_id' => $data['source_warehouse_id'],
                'destination_warehouse_id' => $data['destination_warehouse_id'],
                'product_id' => null,
                'unit_id' => null,
                'quantity' => $baseQuantity,
                'base_unit_quantity' => $baseQuantity,
                'note' => $data['note'] ?? null,
                'created_by' => $actor?->id,
            ]);

            foreach ($requestedItems as $requestedItem) {
                $sourceBatch = $sourceBatches->get($requestedItem['stock_batch_id']);
                $moved = (int) $requestedItem['base_unit_quantity'];
                $sourceBatch->decrement('available_base_quantity', $moved);
                $sourceBatch->decrement('received_base_quantity', min($moved, (int) $sourceBatch->received_base_quantity));

                $destinationBatch = StockBatch::query()->firstOrCreate([
                    'company_id' => $data['company_id'],
                    'warehouse_id' => $data['destination_warehouse_id'],
                    'product_id' => $sourceBatch->product_id,
                    'batch_no' => $sourceBatch->batch_no,
                    'expiry_date' => $sourceBatch->expiry_date?->toDateString(),
                ], [
                    'received_base_quantity' => 0,
                    'available_base_quantity' => 0,
                ]);

                $destinationBatch->increment('received_base_quantity', $moved);
                $destinationBatch->increment('available_base_quantity', $moved);

                foreach ([
                    [$sourceBatch, $data['source_warehouse_id'], -$moved],
                    [$destinationBatch, $data['destination_warehouse_id'], $moved],
                ] as [$batch, $warehouseId, $quantity]) {
                    StockMovement::create([
                        'company_id' => $data['company_id'],
                        'warehouse_id' => $warehouseId,
                        'product_id' => $batch->product_id,
                        'stock_batch_id' => $batch->id,
                        'movement_type' => 'transfer',
                        'base_unit_quantity' => $quantity,
                        'reference_type' => StockTransfer::class,
                        'reference_id' => $transfer->id,
                        'note' => $data['note'] ?? null,
                        'created_by' => $actor?->id,
                    ]);
                }
            }

            return $transfer->fresh([
                'company',
                'sourceWarehouse',
                'destinationWarehouse',
                'movements.product.baseUnit',
                'movements.stockBatch',
                'movements.warehouse',
            ]);
        });
    }
}
