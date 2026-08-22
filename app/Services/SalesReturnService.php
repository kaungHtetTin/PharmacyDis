<?php

namespace App\Services;

use App\Models\CustomerChargeAdjustment;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesReturn;
use App\Models\SalesReturnCommissionAdjustment;
use App\Models\SalesReturnFocItem;
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
        private InvoiceSettlementService $invoiceSettlementService,
        private NumberGeneratorService $numberGeneratorService,
        private StockCostService $stockCostService,
    ) {
    }

    public function post(array $data, ?User $actor = null): SalesReturn
    {
        return DB::transaction(function () use ($data, $actor) {
            if (! empty($data['idempotency_key'])) {
                $existing = SalesReturn::where('idempotency_key', $data['idempotency_key'])->first();
                if ($existing) {
                    return $this->freshReturn($existing);
                }
            }

            $invoice = Invoice::query()
                ->with(['salesOrder.items', 'salesOrder.focItems.focRule', 'items', 'allocations'])
                ->lockForUpdate()
                ->findOrFail($data['invoice_id']);

            if ($invoice->status === 'void') {
                throw ValidationException::withMessages(['invoice_id' => 'Void invoices cannot receive returns.']);
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
                'credit_note_no' => $this->numberGeneratorService->next(SalesReturn::class, 'credit_note_no', 'CRN'),
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'invoice_id' => $invoice->id,
                'sales_order_id' => $invoice->sales_order_id,
                'company_id' => $invoice->company_id,
                'customer_id' => $invoice->customer_id,
                'warehouse_id' => $data['warehouse_id'],
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'reason' => $data['reason'] ?? null,
                'reason_code' => $data['reason_code'] ?? 'customer_return',
                'status' => 'posted',
                'posted_at' => now(),
                'posted_by' => $actor?->id,
                'created_by' => $actor?->id,
            ]);

            $returnTotal = 0.0;
            $taxReturnTotal = 0.0;
            $affectedOrderItemIds = [];
            $invoiceMerchandiseTotal = max(0.01, (float) $invoice->items->sum('line_total'));
            $priorTaxReturned = (float) SalesReturnItem::query()
                ->whereHas('salesReturn', fn ($query) => $query
                    ->where('invoice_id', $invoice->id)
                    ->where('status', 'posted'))
                ->sum('tax_amount');
            $remainingTax = max(0, (float) $invoice->tax_amount - $priorTaxReturned);

            foreach ($data['items'] as $index => $itemData) {
                $invoiceItem = InvoiceItem::query()
                    ->with(['product', 'unit', 'salesOrderItem'])
                    ->where('invoice_id', $invoice->id)
                    ->lockForUpdate()
                    ->findOrFail($itemData['invoice_item_id']);
                $quantity = (int) $itemData['quantity'];
                $baseQuantity = $quantity * (int) $invoiceItem->conversion_factor_to_base;
                $previousBaseQuantity = (int) SalesReturnItem::query()
                    ->where('invoice_item_id', $invoiceItem->id)
                    ->whereHas('salesReturn', fn ($query) => $query->where('status', 'posted'))
                    ->sum('base_unit_quantity');
                $remainingBaseQuantity = max(0, (int) $invoiceItem->base_unit_quantity - $previousBaseQuantity);

                if ($baseQuantity > $remainingBaseQuantity) {
                    throw ValidationException::withMessages([
                        "items.$index.quantity" => 'Return quantity exceeds the remaining returnable invoice quantity.',
                    ]);
                }

                $ratio = (int) $invoiceItem->base_unit_quantity > 0
                    ? $baseQuantity / (int) $invoiceItem->base_unit_quantity
                    : 0;
                $discountReturn = $this->money((float) $invoiceItem->discount_amount * $ratio);
                $lineReturn = min($this->money((float) $invoiceItem->line_total * $ratio), $this->money($invoiceItem->line_total));
                $taxReturn = min($remainingTax, $this->money((float) $invoice->tax_amount * ($lineReturn / $invoiceMerchandiseTotal)));
                $remainingTax = $this->money(max(0, $remainingTax - $taxReturn));
                $batchNo = $itemData['batch_no']
                    ?? "{$salesReturn->return_no}-" . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
                $baseUnitCost = $this->stockCostService->salesOrderProductCost($salesReturn->sales_order_id, (int) $invoiceItem->product_id)
                    ?? $this->stockCostService->latestReceiptCost((int) $salesReturn->company_id, (int) $invoiceItem->product_id, $salesReturn->return_date);

                $returnItem = SalesReturnItem::create([
                    'sales_return_id' => $salesReturn->id,
                    'invoice_item_id' => $invoiceItem->id,
                    'sales_order_item_id' => $invoiceItem->sales_order_item_id,
                    'product_id' => $invoiceItem->product_id,
                    'unit_id' => $invoiceItem->unit_id,
                    'condition' => $itemData['condition'],
                    'quantity' => $quantity,
                    'conversion_factor_to_base' => $invoiceItem->conversion_factor_to_base,
                    'base_unit_quantity' => $baseQuantity,
                    'base_unit_cost' => $baseUnitCost,
                    'unit_price' => $invoiceItem->unit_price,
                    'discount_amount' => $discountReturn,
                    'line_total' => $lineReturn,
                    'tax_amount' => $taxReturn,
                    'batch_no' => $batchNo,
                    'expiry_date' => $itemData['expiry_date'] ?? null,
                    'reason' => $itemData['reason'] ?? null,
                ]);

                $this->receiveReturnedStock($salesReturn, $invoiceItem, $baseQuantity, $baseUnitCost, $batchNo, $itemData, $actor);
                $this->recordCommissionReversal($salesReturn, $returnItem, $invoiceItem, $baseQuantity, $actor);

                if ($invoiceItem->sales_order_item_id) {
                    $affectedOrderItemIds[] = (int) $invoiceItem->sales_order_item_id;
                }

                $returnTotal += $lineReturn + $taxReturn;
                $taxReturnTotal += $taxReturn;
            }

            if ($returnTotal <= 0) {
                throw ValidationException::withMessages(['items' => 'Return total must be greater than zero.']);
            }

            $this->recordFocDispositions(
                $salesReturn,
                array_values(array_unique($affectedOrderItemIds)),
                $data['foc_items'] ?? [],
                $actor
            );

            $salesReturn->update([
                'total_amount' => $this->money($returnTotal),
                'tax_amount' => $this->money($taxReturnTotal),
            ]);
            $this->invoiceSettlementService->recalculate($invoice, $actor);
            $this->customerBalanceService->refresh((int) $invoice->customer_id, (int) $invoice->company_id);

            return $this->freshReturn($salesReturn);
        });
    }

    public function void(SalesReturn $salesReturn, ?User $actor = null, ?string $reason = null): SalesReturn
    {
        return DB::transaction(function () use ($salesReturn, $actor, $reason) {
            $salesReturn = SalesReturn::query()->lockForUpdate()->findOrFail($salesReturn->id);
            if ($salesReturn->status === 'void') {
                return $this->freshReturn($salesReturn);
            }

            $movements = StockMovement::query()
                ->where('reference_type', SalesReturn::class)
                ->where('reference_id', $salesReturn->id)
                ->where('movement_type', 'return')
                ->where('base_unit_quantity', '>', 0)
                ->lockForUpdate()
                ->get();

            foreach ($movements as $movement) {
                $batch = StockBatch::query()->lockForUpdate()->find($movement->stock_batch_id);
                if (! $batch) {
                    continue;
                }

                $quantity = (int) $movement->base_unit_quantity;
                $bucket = str_starts_with((string) $movement->note, 'damaged')
                    ? 'damaged_base_quantity'
                    : (str_starts_with((string) $movement->note, 'expired') ? 'expired_base_quantity' : 'available_base_quantity');
                if ((int) $batch->{$bucket} < $quantity || (int) $batch->received_base_quantity < $quantity) {
                    throw ValidationException::withMessages([
                        'return' => 'Returned stock has subsequent movement and this return cannot be voided automatically.',
                    ]);
                }

                $batch->decrement($bucket, $quantity);
                $batch->decrement('received_base_quantity', $quantity);
                StockMovement::create([
                    'company_id' => $movement->company_id,
                    'warehouse_id' => $movement->warehouse_id,
                    'product_id' => $movement->product_id,
                    'stock_batch_id' => $movement->stock_batch_id,
                    'movement_type' => 'return',
                    'base_unit_quantity' => -$quantity,
                    'reference_type' => SalesReturn::class,
                    'reference_id' => $salesReturn->id,
                    'note' => 'Return void reversal. ' . ($reason ?? ''),
                    'created_by' => $actor?->id,
                ]);
            }

            $salesReturn->update([
                'status' => 'void',
                'voided_at' => now(),
                'voided_by' => $actor?->id,
                'reason' => trim(($salesReturn->reason ? $salesReturn->reason . ' | ' : '') . 'Void: ' . ($reason ?: 'No reason supplied')),
            ]);
            $salesReturn->focItems()->update(['status' => 'void']);
            $salesReturn->commissionAdjustments()->update(['status' => 'void']);
            CustomerChargeAdjustment::query()
                ->where('sales_return_id', $salesReturn->id)
                ->where('status', 'posted')
                ->update(['status' => 'void']);

            $invoice = Invoice::query()->lockForUpdate()->findOrFail($salesReturn->invoice_id);
            $this->invoiceSettlementService->recalculate($invoice, $actor);
            $this->customerBalanceService->refresh((int) $invoice->customer_id, (int) $invoice->company_id);

            return $this->freshReturn($salesReturn);
        });
    }

    private function recordCommissionReversal(SalesReturn $salesReturn, SalesReturnItem $returnItem, InvoiceItem $invoiceItem, int $baseQuantity, ?User $actor): void
    {
        $orderItem = $invoiceItem->salesOrderItem;
        if (! $orderItem || (int) $orderItem->base_unit_quantity <= 0) {
            return;
        }

        $reversal = min(
            $this->money($orderItem->commission_amount),
            $this->money((float) $orderItem->commission_amount * ($baseQuantity / (int) $orderItem->base_unit_quantity))
        );
        SalesReturnCommissionAdjustment::create([
            'sales_return_id' => $salesReturn->id,
            'sales_return_item_id' => $returnItem->id,
            'sales_order_item_id' => $orderItem->id,
            'original_commission_amount' => $orderItem->commission_amount,
            'reversal_amount' => $reversal,
            'calculation_basis' => 'proportional_return',
            'status' => 'posted',
            'created_by' => $actor?->id,
            'approved_by' => $actor?->id,
            'approved_at' => now(),
        ]);
    }

    private function recordFocDispositions(SalesReturn $salesReturn, array $affectedOrderItemIds, array $submittedFocItems, ?User $actor): void
    {
        if ($affectedOrderItemIds === []) {
            return;
        }

        $submitted = collect($submittedFocItems)->keyBy(fn ($item) => (int) ($item['sales_order_foc_item_id'] ?? 0));
        $focItems = $salesReturn->salesOrder->focItems()
            ->with('focRule')
            ->whereIn('sales_order_item_id', $affectedOrderItemIds)
            ->lockForUpdate()
            ->get();

        foreach ($focItems as $focItem) {
            $previouslyDisposed = (int) SalesReturnFocItem::query()
                ->where('sales_order_foc_item_id', $focItem->id)
                ->whereIn('status', ['posted', 'pending_review'])
                ->sum('base_unit_quantity');
            $orderItem = $salesReturn->salesOrder->items->firstWhere('id', $focItem->sales_order_item_id);
            if (! $orderItem || (int) $orderItem->base_unit_quantity <= 0) {
                continue;
            }
            $returnedBaseQuantity = (int) SalesReturnItem::query()
                ->where('sales_order_item_id', $orderItem->id)
                ->whereHas('salesReturn', fn ($query) => $query->where('status', 'posted'))
                ->sum('base_unit_quantity');
            $remainingBaseQuantity = max(0, (int) $orderItem->base_unit_quantity - $returnedBaseQuantity);
            $remainingEntitlement = $this->remainingFocEntitlement($focItem, $orderItem, $remainingBaseQuantity);
            $requiredQuantity = max(
                0,
                (int) $focItem->reward_base_unit_quantity - $remainingEntitlement - $previouslyDisposed
            );
            if ($requiredQuantity === 0) {
                continue;
            }

            $decision = $submitted->get((int) $focItem->id);
            if (! $decision || (int) ($decision['base_unit_quantity'] ?? 0) !== $requiredQuantity) {
                throw ValidationException::withMessages([
                    'foc_items' => "FOC reward #{$focItem->id} requires a disposition for {$requiredQuantity} base units.",
                ]);
            }

            $disposition = $decision['disposition'] ?? '';
            if (! in_array($disposition, ['returned', 'charged', 'waived'], true)) {
                throw ValidationException::withMessages(['foc_items' => 'FOC disposition must be returned, charged, or waived.']);
            }
            if (in_array($disposition, ['charged', 'waived'], true) && empty(trim((string) ($decision['reason'] ?? '')))) {
                throw ValidationException::withMessages(['foc_items' => 'Charged or waived FOC requires a reason.']);
            }
            if (in_array($disposition, ['charged', 'waived'], true)
                && ! in_array($actor?->role?->name, ['admin', 'super_admin'], true)) {
                throw ValidationException::withMessages(['foc_items' => 'Only an administrator can approve charged or waived FOC.']);
            }

            $estimatedValue = (int) $focItem->reward_base_unit_quantity > 0
                ? $this->money((float) $focItem->estimated_value_amount * ($requiredQuantity / (int) $focItem->reward_base_unit_quantity))
                : 0;
            $returnFocItem = SalesReturnFocItem::create([
                'sales_return_id' => $salesReturn->id,
                'sales_order_foc_item_id' => $focItem->id,
                'product_id' => $focItem->product_id,
                'base_unit_quantity' => $requiredQuantity,
                'estimated_value_amount' => $estimatedValue,
                'disposition' => $disposition,
                'status' => 'posted',
                'reason' => $decision['reason'] ?? null,
                'approved_by' => $actor?->id,
                'approved_at' => now(),
            ]);

            if ($disposition === 'returned') {
                $this->receiveReturnedFocStock($salesReturn, (int) $focItem->product_id, $requiredQuantity, $actor);
            } elseif ($disposition === 'charged') {
                $this->createFocChargeAdjustment($returnFocItem, $actor);
            }
        }
    }

    private function remainingFocEntitlement($focItem, $orderItem, int $remainingBaseQuantity): int
    {
        if ($remainingBaseQuantity <= 0) {
            return 0;
        }

        $rule = $focItem->focRule;
        if (! $rule) {
            // Manual FOC has no objective proportional rule. Any paid-line return
            // therefore requires an explicit decision for the remaining reward.
            return 0;
        }

        $basis = $rule->rule_type === 'value'
            ? (float) $orderItem->line_total * ($remainingBaseQuantity / max(1, (int) $orderItem->base_unit_quantity))
            : $remainingBaseQuantity;
        $threshold = $rule->rule_type === 'value'
            ? (float) $rule->minimum_order_value
            : (float) $rule->minimum_quantity_base_units;

        if ($threshold <= 0) {
            return 0;
        }

        return min(
            (int) $focItem->reward_base_unit_quantity,
            (int) floor($basis / $threshold) * (int) $rule->reward_quantity_base_units
        );
    }

    public function resolveHistoricalFoc(SalesReturnFocItem $returnFocItem, array $data, ?User $actor = null): SalesReturnFocItem
    {
        return DB::transaction(function () use ($returnFocItem, $data, $actor) {
            $returnFocItem = SalesReturnFocItem::query()
                ->with(['salesReturn', 'salesOrderFocItem'])
                ->lockForUpdate()
                ->findOrFail($returnFocItem->id);

            if ($returnFocItem->status !== 'pending_review') {
                throw ValidationException::withMessages(['foc_item' => 'Only pending historical FOC decisions can be resolved.']);
            }

            $disposition = (string) $data['disposition'];
            if (in_array($disposition, ['charged', 'waived'], true)
                && ! in_array($actor?->role?->name, ['admin', 'super_admin'], true)) {
                throw ValidationException::withMessages(['disposition' => 'Only an administrator can approve charged or waived FOC.']);
            }
            if ($disposition === 'returned'
                && ! in_array($actor?->role?->name, ['inventory_manager', 'admin', 'super_admin'], true)) {
                throw ValidationException::withMessages(['disposition' => 'Warehouse confirmation is required before returned FOC can increase inventory.']);
            }

            $sourceQuantity = (int) $returnFocItem->salesOrderFocItem->reward_base_unit_quantity;
            $alreadyFinalized = (int) SalesReturnFocItem::query()
                ->where('sales_order_foc_item_id', $returnFocItem->sales_order_foc_item_id)
                ->where('id', '!=', $returnFocItem->id)
                ->where('status', 'posted')
                ->sum('base_unit_quantity');
            if ($alreadyFinalized + (int) $returnFocItem->base_unit_quantity > $sourceQuantity) {
                throw ValidationException::withMessages(['foc_item' => 'Cumulative FOC disposition exceeds the original reward quantity.']);
            }

            $returnFocItem->update([
                'disposition' => $disposition,
                'status' => 'posted',
                'reason' => $data['reason'],
                'approved_by' => $actor?->id,
                'approved_at' => now(),
            ]);

            if ($disposition === 'returned') {
                $this->receiveReturnedFocStock(
                    $returnFocItem->salesReturn,
                    (int) $returnFocItem->product_id,
                    (int) $returnFocItem->base_unit_quantity,
                    $actor
                );
            } elseif ($disposition === 'charged') {
                $this->createFocChargeAdjustment($returnFocItem, $actor);
            }

            $salesReturn = $returnFocItem->salesReturn;
            $this->customerBalanceService->refresh((int) $salesReturn->customer_id, (int) $salesReturn->company_id);

            return $returnFocItem->fresh(['product', 'approver', 'chargeAdjustment']);
        });
    }

    public function approveHistoricalCommission(SalesReturnCommissionAdjustment $adjustment, array $data, ?User $actor = null): SalesReturnCommissionAdjustment
    {
        return DB::transaction(function () use ($adjustment, $data, $actor) {
            $adjustment = SalesReturnCommissionAdjustment::query()->lockForUpdate()->findOrFail($adjustment->id);
            if ($adjustment->status !== 'pending_approval') {
                throw ValidationException::withMessages(['commission_adjustment' => 'Only pending commission proposals can be reviewed.']);
            }

            $adjustment->update([
                'status' => $data['decision'] === 'approve' ? 'posted' : 'rejected',
                'reason' => $data['reason'],
                'approved_by' => $actor?->id,
                'approved_at' => now(),
            ]);

            return $adjustment->fresh(['approver', 'salesReturn']);
        });
    }

    private function receiveReturnedFocStock(SalesReturn $salesReturn, int $productId, int $quantity, ?User $actor): void
    {
        $batchNo = "{$salesReturn->return_no}-FOC-{$productId}";
        $cost = $this->stockCostService->salesOrderProductCost($salesReturn->sales_order_id, $productId)
            ?? $this->stockCostService->latestReceiptCost((int) $salesReturn->company_id, $productId, $salesReturn->return_date);
        if ($cost === null) {
            throw ValidationException::withMessages(['foc_items' => 'Returned FOC stock has no resolvable cost. Resolve inventory cost before posting.']);
        }
        $batch = StockBatch::query()->firstOrCreate([
            'company_id' => $salesReturn->company_id,
            'warehouse_id' => $salesReturn->warehouse_id,
            'product_id' => $productId,
            'batch_no' => $batchNo,
            'expiry_date' => null,
        ], [
            'received_base_quantity' => 0,
            'available_base_quantity' => 0,
            'damaged_base_quantity' => 0,
            'expired_base_quantity' => 0,
        ]);
        $batch = StockBatch::query()->lockForUpdate()->findOrFail($batch->id);
        $this->stockCostService->applyIncomingCost($batch, $quantity, $cost, 'foc_sale_return');
        $batch->increment('received_base_quantity', $quantity);
        $batch->increment('available_base_quantity', $quantity);
        $this->createReturnMovement($salesReturn, $batch, $productId, $quantity, 'FOC returned as part of sales return.', $actor);
    }

    private function receiveReturnedStock(SalesReturn $salesReturn, InvoiceItem $invoiceItem, int $baseQuantity, ?float $baseUnitCost, string $batchNo, array $itemData, ?User $actor): void
    {
        if (($itemData['condition'] ?? 'sellable') === 'sellable' && $baseUnitCost === null) {
            throw ValidationException::withMessages(['items' => 'Sellable returned stock has no resolvable cost. Resolve inventory cost before posting.']);
        }
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
        $batch = StockBatch::query()->lockForUpdate()->findOrFail($batch->id);
        $this->stockCostService->applyIncomingCost($batch, $baseQuantity, $baseUnitCost, 'original_sale_return');
        $batch->increment('received_base_quantity', $baseQuantity);
        match ($itemData['condition']) {
            'damaged' => $batch->increment('damaged_base_quantity', $baseQuantity),
            'expired' => $batch->increment('expired_base_quantity', $baseQuantity),
            default => $batch->increment('available_base_quantity', $baseQuantity),
        };
        $this->createReturnMovement(
            $salesReturn,
            $batch,
            (int) $invoiceItem->product_id,
            $baseQuantity,
            trim(($itemData['condition'] ?? 'sellable') . ' return. ' . ($itemData['reason'] ?? '')),
            $actor
        );
    }

    private function createReturnMovement(SalesReturn $salesReturn, StockBatch $batch, int $productId, int $quantity, string $note, ?User $actor): void
    {
        StockMovement::create([
            'company_id' => $salesReturn->company_id,
            'warehouse_id' => $salesReturn->warehouse_id,
            'product_id' => $productId,
            'stock_batch_id' => $batch->id,
            'movement_type' => 'return',
            'base_unit_quantity' => $quantity,
            'reference_type' => SalesReturn::class,
            'reference_id' => $salesReturn->id,
            'note' => $note,
            'created_by' => $actor?->id,
        ]);
    }

    private function createFocChargeAdjustment(SalesReturnFocItem $returnFocItem, ?User $actor): CustomerChargeAdjustment
    {
        $salesReturn = $returnFocItem->salesReturn;

        return CustomerChargeAdjustment::firstOrCreate(
            ['idempotency_key' => "foc-charge:{$returnFocItem->id}"],
            [
                'adjustment_no' => $this->numberGeneratorService->next(CustomerChargeAdjustment::class, 'adjustment_no', 'CADJ'),
                'company_id' => $salesReturn->company_id,
                'customer_id' => $salesReturn->customer_id,
                'invoice_id' => $salesReturn->invoice_id,
                'sales_return_id' => $salesReturn->id,
                'sales_return_foc_item_id' => $returnFocItem->id,
                'adjustment_date' => now()->toDateString(),
                'amount' => $returnFocItem->estimated_value_amount,
                'status' => 'posted',
                'reason' => $returnFocItem->reason ?: 'FOC entitlement charged after paid goods return.',
                'approved_by' => $actor?->id,
                'approved_at' => now(),
            ]
        );
    }

    private function freshReturn(SalesReturn $salesReturn): SalesReturn
    {
        return $salesReturn->fresh([
            'company', 'customer', 'warehouse', 'salesOrder.focItems.product',
            'invoice.items.product', 'invoice.items.unit', 'items.product.baseUnit', 'items.unit',
            'focItems.product', 'focItems.salesOrderFocItem', 'focItems.chargeAdjustment', 'commissionAdjustments',
        ]);
    }

    private function money($value): float
    {
        return round((float) $value, 2);
    }
}
