<?php

namespace App\Console\Commands;

use App\Models\FinancialDataRepair;
use App\Models\Invoice;
use App\Models\SalesReturnCommissionAdjustment;
use App\Models\SalesReturnFocItem;
use App\Services\CustomerBalanceService;
use App\Services\InvoiceSettlementService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RepairInvoiceFinancialIntegrity extends Command
{
    protected $signature = 'finance:repair-invoices
        {--apply : Persist the proposed repairs}
        {--dry-run : Explicitly confirm no-write preview mode}
        {--repair-version=2026-08-22-v1 : Idempotent repair version}
        {--from-id= : First invoice ID}
        {--to-id= : Last invoice ID}
        {--chunk=100 : Invoices processed per database chunk}
        {--output= : Write proposed changes as JSON}';

    protected $description = 'Reconstruct immutable invoice lines and settlement fields; dry-run unless --apply is supplied.';

    public function handle(InvoiceSettlementService $settlementService, CustomerBalanceService $customerBalanceService): int
    {
        if ($this->option('apply') && $this->option('dry-run')) {
            $this->error('Choose either --apply or --dry-run, not both.');
            return self::INVALID;
        }

        $apply = (bool) $this->option('apply');
        $version = (string) $this->option('repair-version');
        $query = Invoice::query()->with(['salesOrder.items', 'items', 'salesReturns.items']);
        $query->when($this->option('from-id'), fn ($q) => $q->where('id', '>=', (int) $this->option('from-id')))
            ->when($this->option('to-id'), fn ($q) => $q->where('id', '<=', (int) $this->option('to-id')));

        $changes = [];
        $quarantined = [];
        $query->orderBy('id')->chunkById(max(1, (int) $this->option('chunk')), function ($invoices) use (&$changes, &$quarantined, $apply, $version, $settlementService, $customerBalanceService) {
            foreach ($invoices as $invoice) {
                $repairKey = "{$version}:invoice:{$invoice->id}";
                if ($apply && FinancialDataRepair::where('repair_key', $repairKey)->exists()) {
                    continue;
                }

                $postedReturnTotal = round((float) $invoice->salesReturns->where('status', 'posted')->sum('total_amount'), 2);
                $expectedOriginal = round((float) ($invoice->salesOrder?->total_amount
                    ?? ((float) $invoice->total_amount + (float) $invoice->cash_back_amount + $postedReturnTotal)), 2);
                $legacyControl = round((float) $invoice->total_amount + (float) $invoice->cash_back_amount + $postedReturnTotal, 2);
                if ($invoice->sales_order_id && abs($expectedOriginal - $legacyControl) > 0.01
                    && (float) $invoice->original_total_amount <= 0) {
                    $quarantined[] = [
                        'invoice_id' => $invoice->id,
                        'invoice_no' => $invoice->invoice_no,
                        'order_total' => $expectedOriginal,
                        'legacy_reconstructed_total' => $legacyControl,
                        'reason' => 'Order and legacy invoice/return control do not reconcile.',
                    ];
                    continue;
                }

                $before = $invoice->only([
                    'subtotal_amount', 'discount_amount', 'tax_amount', 'total_amount', 'original_total_amount',
                    'return_credit_amount', 'net_collectible_amount', 'paid_amount', 'balance_amount', 'status', 'settlement_status',
                ]);
                $itemChanges = $this->desiredItemValues($invoice);
                $preview = $settlementService->preview($invoice);
                $headerValues = $this->desiredHeaderValues($invoice, $expectedOriginal);
                $after = array_merge($before, $headerValues, $preview, [
                    'total_amount' => $expectedOriginal,
                    'status' => $preview['legacy_status'],
                ]);
                unset($after['legacy_status'], $after['cash_back_amount'], $after['customer_credit_amount']);
                if ($before == $after && $itemChanges === []) {
                    continue;
                }

                $changes[] = [
                    'invoice_id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'before' => $before,
                    'after' => $after,
                    'item_repairs' => $itemChanges,
                ];
                if (! $apply) {
                    continue;
                }

                DB::transaction(function () use ($invoice, $itemChanges, $headerValues, $expectedOriginal, $repairKey, $version, $before, $settlementService, $customerBalanceService) {
                    $lockedInvoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
                    foreach ($itemChanges as $itemChange) {
                        $lockedInvoice->items()->whereKey($itemChange['id'])->update($itemChange['values']);
                    }
                    $lockedInvoice->update(array_merge($headerValues, [
                        'original_total_amount' => $expectedOriginal,
                        'total_amount' => $expectedOriginal,
                    ]));
                    $repaired = $settlementService->recalculate($lockedInvoice);
                    $customerBalanceService->refresh((int) $repaired->customer_id, (int) $repaired->company_id);
                    FinancialDataRepair::create([
                        'repair_key' => $repairKey,
                        'repair_version' => $version,
                        'target_table' => 'invoices',
                        'target_id' => $invoice->id,
                        'before_values' => $before,
                        'after_values' => $repaired->only([
                            'total_amount', 'original_total_amount', 'return_credit_amount', 'net_collectible_amount',
                            'paid_amount', 'balance_amount', 'status', 'settlement_status',
                        ]),
                        'reason' => 'Restore immutable issued invoice and derive settlement from returns and allocations.',
                        'executed_at' => now(),
                    ]);
                });
            }
        });

        $focReviewRows = $this->historicalFocReviews($apply, $version);
        $commissionReviewRows = $this->historicalCommissionReviews($apply, $version);
        $monetaryTotals = [
            'original_total_after' => round((float) collect($changes)->sum(fn ($row) => $row['after']['original_total_amount']), 2),
            'return_credit_after' => round((float) collect($changes)->sum(fn ($row) => $row['after']['return_credit_amount']), 2),
            'net_collectible_after' => round((float) collect($changes)->sum(fn ($row) => $row['after']['net_collectible_amount']), 2),
            'balance_after' => round((float) collect($changes)->sum(fn ($row) => $row['after']['balance_amount']), 2),
            'commission_reversal_proposed' => round((float) collect($commissionReviewRows)->sum('reversal_amount'), 2),
        ];
        $result = [
            'mode' => $apply ? 'apply' : 'dry-run',
            'repair_version' => $version,
            'invoice_changes' => $changes,
            'invoice_change_count' => count($changes),
            'quarantined' => $quarantined,
            'quarantined_count' => count($quarantined),
            'foc_review_rows' => $focReviewRows,
            'foc_review_unit_count' => (int) collect($focReviewRows)->sum('reward_base_unit_quantity'),
            'commission_review_rows' => $commissionReviewRows,
            'commission_review_return_count' => collect($commissionReviewRows)->pluck('sales_return_id')->unique()->count(),
            'monetary_totals' => $monetaryTotals,
        ];
        $json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $this->line($json);
        if ($path = $this->option('output')) {
            file_put_contents($path, $json . PHP_EOL);
        }

        return $quarantined === [] ? self::SUCCESS : self::FAILURE;
    }

    private function desiredItemValues(Invoice $invoice): array
    {
        $orderItems = $invoice->salesOrder?->items?->keyBy('id') ?? collect();
        $changes = [];
        foreach ($invoice->items as $invoiceItem) {
            $orderItem = $orderItems->get($invoiceItem->sales_order_item_id);
            if ($orderItem) {
                $values = $orderItem->only([
                    'product_id', 'unit_id', 'quantity', 'conversion_factor_to_base', 'base_unit_quantity',
                    'unit_price', 'discount_percentage', 'discount_amount', 'foc_base_unit_quantity', 'line_total',
                ]);
            } elseif ((float) $invoice->original_total_amount <= 0) {
                $returns = $invoice->salesReturns->where('status', 'posted')->flatMap->items
                    ->where('invoice_item_id', $invoiceItem->id);
                $values = [
                    'quantity' => (int) $invoiceItem->quantity + (int) $returns->sum('quantity'),
                    'base_unit_quantity' => (int) $invoiceItem->base_unit_quantity + (int) $returns->sum('base_unit_quantity'),
                    'discount_amount' => round((float) $invoiceItem->discount_amount + (float) $returns->sum('discount_amount'), 2),
                    'line_total' => round((float) $invoiceItem->line_total + (float) $returns->sum('line_total'), 2),
                ];
            } else {
                continue;
            }

            if (array_diff_assoc($values, $invoiceItem->only(array_keys($values))) !== []) {
                $changes[] = ['id' => $invoiceItem->id, 'values' => $values];
            }
        }

        return $changes;
    }

    private function desiredHeaderValues(Invoice $invoice, float $expectedOriginal): array
    {
        if ($invoice->salesOrder) {
            return [
                'subtotal_amount' => $this->money($invoice->salesOrder->subtotal_amount),
                'discount_amount' => $this->money($invoice->salesOrder->discount_amount),
                'tax_amount' => $this->money($invoice->salesOrder->tax_amount),
            ];
        }

        $tax = $this->money($invoice->tax_amount);
        $discount = $this->money($invoice->discount_amount);

        return [
            'subtotal_amount' => $this->money($expectedOriginal + $discount - $tax),
            'discount_amount' => $discount,
            'tax_amount' => $tax,
        ];
    }

    private function historicalFocReviews(bool $apply, string $version): array
    {
        $rows = DB::table('sales_order_foc_items as foc')
            ->join('sales_orders as so', 'so.id', '=', 'foc.sales_order_id')
            ->join('invoices as i', 'i.sales_order_id', '=', 'so.id')
            ->join('sales_returns as sr', function ($join) {
                $join->on('sr.invoice_id', '=', 'i.id')->where('sr.status', '=', 'posted')->whereNull('sr.deleted_at');
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')->from('sales_return_foc_items as rf')
                    ->whereColumn('rf.sales_order_foc_item_id', 'foc.id')->whereIn('rf.status', ['posted', 'pending_review']);
            })
            ->select('sr.id as sales_return_id', 'foc.id as sales_order_foc_item_id', 'foc.product_id', 'foc.reward_base_unit_quantity', 'foc.estimated_value_amount')
            ->distinct()->get()->map(fn ($row) => (array) $row)->all();

        if ($apply) {
            foreach ($rows as $row) {
                $key = "{$version}:foc-review:{$row['sales_order_foc_item_id']}";
                DB::transaction(function () use ($row, $key, $version) {
                    if (FinancialDataRepair::where('repair_key', $key)->exists()) {
                        return;
                    }
                    SalesReturnFocItem::create([
                        'sales_return_id' => $row['sales_return_id'],
                        'sales_order_foc_item_id' => $row['sales_order_foc_item_id'],
                        'product_id' => $row['product_id'],
                        'base_unit_quantity' => $row['reward_base_unit_quantity'],
                        'estimated_value_amount' => $row['estimated_value_amount'],
                        'disposition' => 'review_required',
                        'status' => 'pending_review',
                        'reason' => 'Historical return: physical FOC disposition must be confirmed.',
                    ]);
                    FinancialDataRepair::create([
                        'repair_key' => $key,
                        'repair_version' => $version,
                        'target_table' => 'sales_order_foc_items',
                        'target_id' => $row['sales_order_foc_item_id'],
                        'after_values' => ['disposition' => 'review_required'],
                        'reason' => 'Queue historical FOC return for warehouse/finance review.',
                        'executed_at' => now(),
                    ]);
                });
            }
        }

        return $rows;
    }

    private function historicalCommissionReviews(bool $apply, string $version): array
    {
        $rows = DB::table('sales_return_items as ri')
            ->join('sales_returns as sr', 'sr.id', '=', 'ri.sales_return_id')
            ->join('sales_order_items as oi', 'oi.id', '=', 'ri.sales_order_item_id')
            ->whereNull('sr.deleted_at')
            ->where('sr.status', 'posted')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')->from('sales_return_commission_adjustments as ca')
                    ->whereColumn('ca.sales_return_item_id', 'ri.id');
            })
            ->select([
                'sr.id as sales_return_id',
                'ri.id as sales_return_item_id',
                'oi.id as sales_order_item_id',
                'oi.commission_amount as original_commission_amount',
                'oi.base_unit_quantity as original_base_unit_quantity',
                'ri.base_unit_quantity as returned_base_unit_quantity',
            ])
            ->orderBy('sr.id')
            ->orderBy('ri.id')
            ->get()
            ->map(function ($row) {
                $originalQuantity = max(1, (int) $row->original_base_unit_quantity);
                $row->reversal_amount = $this->money(min(
                    (float) $row->original_commission_amount,
                    (float) $row->original_commission_amount * ((int) $row->returned_base_unit_quantity / $originalQuantity)
                ));

                return (array) $row;
            })->all();

        if ($apply) {
            foreach ($rows as $row) {
                $key = "{$version}:commission-review:{$row['sales_return_item_id']}";
                DB::transaction(function () use ($row, $key, $version) {
                    if (FinancialDataRepair::where('repair_key', $key)->exists()) {
                        return;
                    }
                    SalesReturnCommissionAdjustment::create([
                        'sales_return_id' => $row['sales_return_id'],
                        'sales_return_item_id' => $row['sales_return_item_id'],
                        'sales_order_item_id' => $row['sales_order_item_id'],
                        'original_commission_amount' => $row['original_commission_amount'],
                        'reversal_amount' => $row['reversal_amount'],
                        'calculation_basis' => 'historical_proportional_return',
                        'status' => 'pending_approval',
                        'reason' => 'Historical return commission reversal requires finance approval.',
                    ]);
                    FinancialDataRepair::create([
                        'repair_key' => $key,
                        'repair_version' => $version,
                        'target_table' => 'sales_return_items',
                        'target_id' => $row['sales_return_item_id'],
                        'after_values' => ['commission_reversal_amount' => $row['reversal_amount'], 'status' => 'pending_approval'],
                        'reason' => 'Create auditable historical commission reversal proposal.',
                        'executed_at' => now(),
                    ]);
                });
            }
        }

        return $rows;
    }

    private function money($value): float
    {
        return round((float) $value, 2);
    }
}
