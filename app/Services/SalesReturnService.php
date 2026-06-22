<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesReturnService
{
    public function __construct(
        private CustomerBalanceService $customerBalanceService,
        private NumberGeneratorService $numberGeneratorService,
    ) {
    }

    public function post(array $data, ?User $actor = null): SalesReturn
    {
        return DB::transaction(function () use ($data, $actor) {
            $invoice = Invoice::query()
                ->with(['salesOrder', 'allocations'])
                ->lockForUpdate()
                ->findOrFail($data['invoice_id']);

            if ($invoice->status === 'void') {
                throw ValidationException::withMessages([
                    'invoice_id' => 'Void invoices cannot receive returns.',
                ]);
            }

            $order = $invoice->salesOrder;
            $hasPayment = $invoice->allocations->isNotEmpty() || (float) $invoice->paid_amount > 0;

            if (! $order || ($order->status !== 'delivered' && ! $hasPayment)) {
                throw ValidationException::withMessages([
                    'invoice_id' => 'Returns are only allowed for delivered orders or invoices with allocated payments.',
                ]);
            }

            $salesReturn = SalesReturn::create([
                'return_no' => $this->numberGeneratorService->next(SalesReturn::class, 'return_no', 'SRN'),
                'invoice_id' => $invoice->id,
                'sales_order_id' => $invoice->sales_order_id,
                'company_id' => $invoice->company_id,
                'customer_id' => $invoice->customer_id,
                'warehouse_id' => $data['warehouse_id'],
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'reason' => $data['reason'] ?? null,
                'status' => 'posted',
                'created_by' => $actor?->id,
            ]);

            $returnTotal = 0.0;
            $subtotalReturn = 0.0;
            $discountReturn = 0.0;

            foreach ($data['items'] as $index => $itemData) {
                $invoiceItem = InvoiceItem::query()
                    ->with(['product', 'unit'])
                    ->where('invoice_id', $invoice->id)
                    ->lockForUpdate()
                    ->findOrFail($itemData['invoice_item_id']);
                $quantity = (int) $itemData['quantity'];
                $baseQuantity = $quantity * (int) $invoiceItem->conversion_factor_to_base;

                if ($baseQuantity > (int) $invoiceItem->base_unit_quantity || $quantity > (int) $invoiceItem->quantity) {
                    throw ValidationException::withMessages([
                        "items.$index.quantity" => 'Return quantity is more than the remaining invoice item quantity.',
                    ]);
                }

                $ratio = (int) $invoiceItem->base_unit_quantity > 0
                    ? $baseQuantity / (int) $invoiceItem->base_unit_quantity
                    : 0;
                $grossAmount = round($quantity * (float) $invoiceItem->unit_price, 2);
                $itemDiscountReturn = round((float) $invoiceItem->discount_amount * $ratio, 2);
                $lineReturn = min(round((float) $invoiceItem->line_total * $ratio, 2), (float) $invoiceItem->line_total);
                $batchNo = $itemData['batch_no'] ?? null;
                $batchNo = $batchNo ?: "{$salesReturn->return_no}-" . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);

                SalesReturnItem::create([
                    'sales_return_id' => $salesReturn->id,
                    'invoice_item_id' => $invoiceItem->id,
                    'sales_order_item_id' => $invoiceItem->sales_order_item_id,
                    'product_id' => $invoiceItem->product_id,
                    'unit_id' => $invoiceItem->unit_id,
                    'condition' => $itemData['condition'],
                    'quantity' => $quantity,
                    'conversion_factor_to_base' => $invoiceItem->conversion_factor_to_base,
                    'base_unit_quantity' => $baseQuantity,
                    'unit_price' => $invoiceItem->unit_price,
                    'discount_amount' => $itemDiscountReturn,
                    'line_total' => $lineReturn,
                    'batch_no' => $batchNo,
                    'expiry_date' => $itemData['expiry_date'] ?? null,
                    'reason' => $itemData['reason'] ?? null,
                ]);

                $this->receiveReturnedStock($salesReturn, $invoiceItem, $baseQuantity, $batchNo, $itemData, $actor);

                $invoiceItem->update([
                    'quantity' => max(0, (int) $invoiceItem->quantity - $quantity),
                    'base_unit_quantity' => max(0, (int) $invoiceItem->base_unit_quantity - $baseQuantity),
                    'discount_amount' => max(0, (float) $invoiceItem->discount_amount - $itemDiscountReturn),
                    'line_total' => max(0, (float) $invoiceItem->line_total - $lineReturn),
                ]);

                $subtotalReturn += $grossAmount;
                $discountReturn += $itemDiscountReturn;
                $returnTotal += $lineReturn;
            }

            if ($returnTotal <= 0) {
                throw ValidationException::withMessages([
                    'items' => 'Return total must be greater than zero.',
                ]);
            }

            $salesReturn->update(['total_amount' => $returnTotal]);
            $totalAmount = max(0, (float) $invoice->total_amount - $returnTotal);
            $paidAmount = (float) $invoice->paid_amount;
            $balanceAmount = max(0, $totalAmount - $paidAmount);

            $invoice->update([
                'subtotal_amount' => max(0, (float) $invoice->subtotal_amount - $subtotalReturn),
                'discount_amount' => max(0, (float) $invoice->discount_amount - $discountReturn),
                'total_amount' => $totalAmount,
                'balance_amount' => $balanceAmount,
                'status' => $paidAmount >= $totalAmount ? 'paid' : ($paidAmount > 0 ? 'partial' : 'issued'),
            ]);

            $this->customerBalanceService->refresh((int) $invoice->customer_id, (int) $invoice->company_id);

            return $salesReturn->fresh([
                'company',
                'customer',
                'warehouse',
                'invoice.items.product',
                'invoice.items.unit',
                'items.product.baseUnit',
                'items.unit',
            ]);
        });
    }

    private function receiveReturnedStock(SalesReturn $salesReturn, InvoiceItem $invoiceItem, int $baseQuantity, string $batchNo, array $itemData, ?User $actor): void
    {
        $batch = StockBatch::query()->firstOrCreate([
            'company_id' => $salesReturn->company_id,
            'warehouse_id' => $salesReturn->warehouse_id,
            'product_id' => $invoiceItem->product_id,
            'batch_no' => $batchNo,
            'expiry_date' => $itemData['expiry_date'] ?? null,
        ], [
            'received_base_quantity' => 0,
            'available_base_quantity' => 0,
            'damaged_base_quantity' => 0,
            'expired_base_quantity' => 0,
        ]);

        $batch->increment('received_base_quantity', $baseQuantity);

        match ($itemData['condition']) {
            'damaged' => $batch->increment('damaged_base_quantity', $baseQuantity),
            'expired' => $batch->increment('expired_base_quantity', $baseQuantity),
            default => $batch->increment('available_base_quantity', $baseQuantity),
        };

        StockMovement::create([
            'company_id' => $salesReturn->company_id,
            'warehouse_id' => $salesReturn->warehouse_id,
            'product_id' => $invoiceItem->product_id,
            'stock_batch_id' => $batch->id,
            'movement_type' => 'return',
            'base_unit_quantity' => $baseQuantity,
            'reference_type' => SalesReturn::class,
            'reference_id' => $salesReturn->id,
            'note' => trim(($itemData['condition'] ?? 'sellable') . ' return. ' . ($itemData['reason'] ?? '')),
            'created_by' => $actor?->id,
        ]);
    }
}
