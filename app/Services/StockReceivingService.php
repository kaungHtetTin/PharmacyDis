<?php

namespace App\Services;

use App\Models\CompanyPayable;
use App\Models\Product;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StockReceipt;
use App\Models\StockReceiptItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockReceivingService
{
    public function __construct(
        private ProductUnitConversionService $conversionService,
        private NumberGeneratorService $numberGeneratorService,
    ) {
    }

    public function postReceipt(array $data, ?User $actor = null): StockReceipt
    {
        return DB::transaction(function () use ($data, $actor) {
            $receipt = StockReceipt::create([
                'receipt_no' => $this->numberGeneratorService->next(StockReceipt::class, 'receipt_no', 'SR'),
                'company_id' => $data['company_id'],
                'warehouse_id' => $data['warehouse_id'] ?? null,
                'received_date' => $data['received_date'] ?? now()->toDateString(),
                'supplier_invoice_no' => $data['supplier_invoice_no'] ?? null,
                'payable_due_date' => $data['payable_due_date'] ?? null,
                'status' => 'posted',
                'created_by' => $actor?->id,
            ]);

            $this->applyItemsAndPayable($receipt, $data, $actor);

            return $receipt->fresh(['company', 'warehouse', 'items.product.baseUnit', 'items.unit', 'items.focUnit', 'payable']);
        });
    }

    public function replaceReceipt(StockReceipt $receipt, array $data, ?User $actor = null): StockReceipt
    {
        return DB::transaction(function () use ($receipt, $data, $actor) {
            $this->clearGeneratedInventory($receipt);

            $receipt->update([
                'company_id' => $data['company_id'],
                'warehouse_id' => $data['warehouse_id'] ?? null,
                'received_date' => $data['received_date'] ?? $receipt->received_date ?? now()->toDateString(),
                'supplier_invoice_no' => $data['supplier_invoice_no'] ?? null,
                'payable_due_date' => $data['payable_due_date'] ?? null,
                'status' => $data['status'] ?? 'posted',
            ]);

            $this->applyItemsAndPayable($receipt->fresh(), $data, $actor);

            return $receipt->fresh(['company', 'warehouse', 'items.product.baseUnit', 'items.unit', 'items.focUnit', 'payable']);
        });
    }

    public function deleteReceipt(StockReceipt $receipt): void
    {
        DB::transaction(function () use ($receipt) {
            $this->clearGeneratedInventory($receipt);
            $receipt->delete();
        });
    }

    private function applyItemsAndPayable(StockReceipt $receipt, array $data, ?User $actor = null): void
    {
        $subtotal = 0;
        $commissionTotal = 0;

        foreach ($data['items'] ?? [] as $index => $itemData) {
            $product = Product::where('company_id', $receipt->company_id)->findOrFail($itemData['product_id']);
            $productUnit = $this->conversionService->resolve($product, (int) $itemData['unit_id']);
            $batchNo = $itemData['batch_no'] ?? null;
            $batchNo = $batchNo ?: $this->makeBatchNo($product, $receipt, $index);
            $quantity = (int) $itemData['quantity'];
            $paidBaseQuantity = $quantity * $productUnit->conversion_factor_to_base;
            $focQuantity = (int) ($itemData['foc_quantity'] ?? 0);
            $focUnitId = $itemData['foc_unit_id'] ?? $productUnit->unit_id;
            $focProductUnit = $focQuantity > 0
                ? $this->conversionService->resolve($product, (int) $focUnitId)
                : null;
            $focBaseQuantity = $focProductUnit ? $focQuantity * $focProductUnit->conversion_factor_to_base : 0;
            $baseQuantity = $paidBaseQuantity + $focBaseQuantity;
            $unitCost = (float) ($itemData['unit_cost'] ?? 0);
            $grossLineTotal = $quantity * $unitCost;
            $commissionRate = (float) ($product->commission_rate_percentage ?? 0);
            $commissionAmount = $grossLineTotal * $commissionRate / 100;
            $lineTotal = max(0, $grossLineTotal - $commissionAmount);
            $subtotal += $grossLineTotal;
            $commissionTotal += $commissionAmount;

            StockReceiptItem::create([
                'stock_receipt_id' => $receipt->id,
                'product_id' => $product->id,
                'unit_id' => $productUnit->unit_id,
                'foc_unit_id' => $focProductUnit?->unit_id,
                'quantity' => $quantity,
                'foc_quantity' => $focQuantity,
                'conversion_factor_to_base' => $productUnit->conversion_factor_to_base,
                'foc_conversion_factor_to_base' => $focProductUnit?->conversion_factor_to_base ?? 1,
                'base_unit_quantity' => $baseQuantity,
                'unit_cost' => $unitCost,
                'foc_base_unit_quantity' => $focBaseQuantity,
                'commission_rate_percentage' => $commissionRate,
                'commission_amount' => $commissionAmount,
                'line_total' => $lineTotal,
                'batch_no' => $batchNo,
                'manufactured_date' => $itemData['manufactured_date'] ?? null,
                'expiry_date' => $itemData['expiry_date'] ?? null,
            ]);

            $batch = StockBatch::create([
                'company_id' => $receipt->company_id,
                'warehouse_id' => $receipt->warehouse_id,
                'product_id' => $product->id,
                'batch_no' => $batchNo,
                'expiry_date' => $itemData['expiry_date'] ?? null,
                'received_base_quantity' => $baseQuantity,
                'available_base_quantity' => $baseQuantity,
            ]);

            StockMovement::create([
                'company_id' => $receipt->company_id,
                'warehouse_id' => $receipt->warehouse_id,
                'product_id' => $product->id,
                'stock_batch_id' => $batch->id,
                'movement_type' => 'receipt',
                'base_unit_quantity' => $baseQuantity,
                'reference_type' => StockReceipt::class,
                'reference_id' => $receipt->id,
                'created_by' => $actor?->id,
            ]);
        }

        $paidAmount = (float) ($data['paid_amount'] ?? 0);
        $total = max(0, $subtotal - $commissionTotal);
        $due = max(0, $total - $paidAmount);
        $paymentStatus = $due <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'unpaid');

        $receipt->update([
            'subtotal_amount' => $subtotal,
            'discount_amount' => $commissionTotal,
            'total_amount' => $total,
            'paid_amount' => $paidAmount,
            'due_amount' => $due,
            'payment_status' => $paymentStatus,
        ]);

        CompanyPayable::create([
            'company_id' => $receipt->company_id,
            'stock_receipt_id' => $receipt->id,
            'payable_date' => $receipt->received_date,
            'due_date' => $receipt->payable_due_date,
            'amount' => $total,
            'paid_amount' => $paidAmount,
            'balance_amount' => $due,
            'status' => $paymentStatus,
        ]);
    }

    private function clearGeneratedInventory(StockReceipt $receipt): void
    {
        $receiptMovements = StockMovement::query()
            ->where('reference_type', StockReceipt::class)
            ->where('reference_id', $receipt->id)
            ->where('movement_type', 'receipt')
            ->get();
        $batchIds = $receiptMovements->pluck('stock_batch_id')->filter()->unique()->values();
        $batches = StockBatch::whereIn('id', $batchIds)->get();

        foreach ($batches as $batch) {
            $hasOtherMovement = StockMovement::query()
                ->where('stock_batch_id', $batch->id)
                ->where(function ($query) use ($receipt) {
                    $query->where('reference_type', '!=', StockReceipt::class)
                        ->orWhere('reference_id', '!=', $receipt->id)
                        ->orWhere('movement_type', '!=', 'receipt');
                })
                ->exists();

            $hasConsumedStock = (int) $batch->available_base_quantity !== (int) $batch->received_base_quantity
                || (int) $batch->reserved_base_quantity > 0
                || (int) $batch->sold_base_quantity > 0
                || (int) $batch->damaged_base_quantity > 0
                || (int) $batch->expired_base_quantity > 0;

            if ($hasOtherMovement || $hasConsumedStock) {
                throw ValidationException::withMessages([
                    'receipt' => 'This receiving record has stock movement history and cannot be edited or deleted.',
                ]);
            }
        }

        StockMovement::query()
            ->where('reference_type', StockReceipt::class)
            ->where('reference_id', $receipt->id)
            ->delete();
        StockBatch::whereIn('id', $batchIds)->delete();
        StockReceiptItem::where('stock_receipt_id', $receipt->id)->delete();
        CompanyPayable::where('stock_receipt_id', $receipt->id)->delete();
    }

    private function makeBatchNo(Product $product, StockReceipt $receipt, int $index): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $product->sku ?: $product->name), 0, 12));
        $prefix = $prefix !== '' ? $prefix : 'MED';
        $date = $receipt->received_date ? $receipt->received_date->format('ymd') : now()->format('ymd');
        $sequence = str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);

        return "{$prefix}-{$date}-{$sequence}";
    }
}
