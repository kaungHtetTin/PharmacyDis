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

            $subtotal = 0;

            foreach ($data['items'] ?? [] as $itemData) {
                $product = Product::where('company_id', $receipt->company_id)->findOrFail($itemData['product_id']);
                $productUnit = $this->conversionService->resolve($product, (int) $itemData['unit_id']);
                $quantity = (int) $itemData['quantity'];
                $baseQuantity = $quantity * $productUnit->conversion_factor_to_base;
                $unitCost = (float) ($itemData['unit_cost'] ?? 0);
                $lineTotal = $quantity * $unitCost;
                $subtotal += $lineTotal;

                StockReceiptItem::create([
                    'stock_receipt_id' => $receipt->id,
                    'product_id' => $product->id,
                    'unit_id' => $productUnit->unit_id,
                    'quantity' => $quantity,
                    'conversion_factor_to_base' => $productUnit->conversion_factor_to_base,
                    'base_unit_quantity' => $baseQuantity,
                    'unit_cost' => $unitCost,
                    'line_total' => $lineTotal,
                    'batch_no' => $itemData['batch_no'] ?? null,
                    'manufactured_date' => $itemData['manufactured_date'] ?? null,
                    'expiry_date' => $itemData['expiry_date'] ?? null,
                ]);

                $batch = StockBatch::create([
                    'company_id' => $receipt->company_id,
                    'warehouse_id' => $receipt->warehouse_id,
                    'product_id' => $product->id,
                    'batch_no' => $itemData['batch_no'] ?? null,
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

            $discount = (float) ($data['discount_amount'] ?? 0);
            $paidAmount = (float) ($data['paid_amount'] ?? 0);
            $total = $subtotal - $discount;
            $due = max(0, $total - $paidAmount);

            $receipt->update([
                'subtotal_amount' => $subtotal,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'paid_amount' => $paidAmount,
                'due_amount' => $due,
                'payment_status' => $due <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'unpaid'),
            ]);

            CompanyPayable::create([
                'company_id' => $receipt->company_id,
                'stock_receipt_id' => $receipt->id,
                'payable_date' => $receipt->received_date,
                'due_date' => $receipt->payable_due_date,
                'amount' => $total,
                'paid_amount' => $paidAmount,
                'balance_amount' => $due,
                'status' => $due <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'unpaid'),
            ]);

            return $receipt->fresh('items');
        });
    }
}
