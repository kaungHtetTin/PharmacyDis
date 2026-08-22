<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Services\InvoiceSettlementService;
use App\Services\FinancialReportService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AuditFinancialIntegrity extends Command
{
    protected $signature = 'finance:audit {--output= : Write the JSON audit to this path}';

    protected $description = 'Audit invoice, payment, return, supplier-payment, and inventory-cost integrity.';

    public function handle(InvoiceSettlementService $settlementService, FinancialReportService $financialReportService): int
    {
        $cacheMismatchCount = 0;
        Invoice::query()->with('salesOrder')->chunkById(200, function ($invoices) use (&$cacheMismatchCount, $settlementService) {
            foreach ($invoices as $invoice) {
                $expected = $settlementService->preview($invoice);
                if ($this->moneyDiffers($invoice->original_total_amount, $expected['original_total_amount'])
                    || $this->moneyDiffers($invoice->return_credit_amount, $expected['return_credit_amount'])
                    || $this->moneyDiffers($invoice->net_collectible_amount, $expected['net_collectible_amount'])
                    || $this->moneyDiffers($invoice->paid_amount, $expected['paid_amount'])
                    || $this->moneyDiffers($invoice->balance_amount, $invoice->status === 'void' ? 0 : $expected['balance_amount'])
                    || ($invoice->settlement_status ?? '') !== $expected['settlement_status']) {
                    $cacheMismatchCount++;
                }
            }
        });

        $payablePaid = (float) DB::table('company_payables')->whereNull('deleted_at')->sum('paid_amount');
        $supplierPayments = (float) DB::table('company_payments')->whereNull('deleted_at')->sum('amount');
        $augustSnapshot = $financialReportService->periodSnapshot(
            Carbon::create(2026, 8, 1)->startOfDay(),
            Carbon::create(2026, 8, 31)->endOfDay()
        );
        $checks = [
            'invoice_settlement_cache_mismatches' => $cacheMismatchCount,
            'false_paid_zero_payment_invoices' => Invoice::query()
                ->where('status', 'paid')->where('paid_amount', 0)->whereDoesntHave('allocations')->count(),
            'invoice_allocation_amount_mismatches' => (int) DB::table('invoices')
                ->leftJoinSub(
                    DB::table('payment_allocations')->join('payments', 'payments.id', '=', 'payment_allocations.payment_id')
                        ->whereNull('payments.deleted_at')->groupBy('payment_allocations.invoice_id')
                        ->selectRaw('payment_allocations.invoice_id, SUM(payment_allocations.allocated_amount) allocated'),
                    'pa', 'pa.invoice_id', '=', 'invoices.id'
                )
                ->whereNull('invoices.deleted_at')
                ->whereRaw('ABS(invoices.paid_amount - COALESCE(pa.allocated, 0)) > 0.01')->count(),
            'invoice_order_total_mismatches' => (int) DB::table('invoices as i')
                ->join('sales_orders as so', 'so.id', '=', 'i.sales_order_id')
                ->whereNull('i.deleted_at')->where('i.status', '!=', 'void')
                ->whereRaw('ABS(i.original_total_amount - so.total_amount) > 0.01')->count(),
            'invoice_order_line_mismatches' => (int) DB::table('invoice_items as ii')
                ->join('invoices as i', 'i.id', '=', 'ii.invoice_id')
                ->join('sales_order_items as oi', 'oi.id', '=', 'ii.sales_order_item_id')
                ->whereNull('i.deleted_at')->where('i.status', '!=', 'void')
                ->where(function ($query) {
                    $query->whereColumn('ii.base_unit_quantity', '!=', 'oi.base_unit_quantity')
                        ->orWhereRaw('ABS(ii.line_total - oi.line_total) > 0.01');
                })->count(),
            'return_quantity_excess_count' => (int) DB::query()->fromSub(
                DB::table('sales_return_items as ri')
                    ->join('sales_returns as sr', 'sr.id', '=', 'ri.sales_return_id')
                    ->join('invoice_items as ii', 'ii.id', '=', 'ri.invoice_item_id')
                    ->whereNull('sr.deleted_at')->where('sr.status', 'posted')
                    ->groupBy('ri.invoice_item_id', 'ii.base_unit_quantity')
                    ->havingRaw('SUM(ri.base_unit_quantity) > ii.base_unit_quantity')
                    ->selectRaw('ri.invoice_item_id'),
                'return_excess'
            )->count(),
            'foc_disposition_excess_count' => (int) DB::query()->fromSub(
                DB::table('sales_return_foc_items as rf')
                    ->join('sales_order_foc_items as foc', 'foc.id', '=', 'rf.sales_order_foc_item_id')
                    ->where('rf.status', 'posted')
                    ->groupBy('rf.sales_order_foc_item_id', 'foc.reward_base_unit_quantity')
                    ->havingRaw('SUM(rf.base_unit_quantity) > foc.reward_base_unit_quantity')
                    ->selectRaw('rf.sales_order_foc_item_id'),
                'foc_excess'
            )->count(),
            'pending_foc_review_count' => (int) DB::table('sales_return_foc_items')->where('status', 'pending_review')->count(),
            'pending_foc_review_units' => (int) DB::table('sales_return_foc_items')->where('status', 'pending_review')->sum('base_unit_quantity'),
            'pending_commission_adjustment_count' => (int) DB::table('sales_return_commission_adjustments')->where('status', 'pending_approval')->count(),
            'pending_commission_return_count' => (int) DB::table('sales_return_commission_adjustments')->where('status', 'pending_approval')->distinct()->count('sales_return_id'),
            'supplier_payment_difference' => round($payablePaid - $supplierPayments, 2),
            'available_batches_missing_cost' => (int) DB::table('stock_batches')
                ->where('available_base_quantity', '>', 0)->whereNull('base_unit_cost')->count(),
            'available_units_missing_cost' => (int) DB::table('stock_batches')
                ->where('available_base_quantity', '>', 0)->whereNull('base_unit_cost')->sum('available_base_quantity'),
            'posted_return_count' => (int) DB::table('sales_returns')
                ->whereNull('deleted_at')->where('status', 'posted')->count(),
            'posted_return_total' => round((float) DB::table('sales_returns')
                ->whereNull('deleted_at')->where('status', 'posted')->sum('total_amount'), 2),
            'customer_credit_liability' => round((float) DB::table('customer_credits')->where('status', 'available')->sum('available_amount'), 2),
            'posted_customer_charge_adjustments' => round((float) DB::table('customer_charge_adjustments')->where('status', 'posted')->sum('amount'), 2),
            'available_stock_value' => $financialReportService->stockCostCoverage()['resolved_value'],
            'august_2026_event_date_controls' => $augustSnapshot,
        ];
        $checks['healthy'] = $checks['invoice_settlement_cache_mismatches'] === 0
            && $checks['false_paid_zero_payment_invoices'] === 0
            && $checks['invoice_allocation_amount_mismatches'] === 0
            && $checks['invoice_order_total_mismatches'] === 0
            && $checks['invoice_order_line_mismatches'] === 0
            && $checks['return_quantity_excess_count'] === 0
            && $checks['foc_disposition_excess_count'] === 0
            && $checks['pending_foc_review_count'] === 0
            && $checks['pending_commission_adjustment_count'] === 0
            && abs($checks['supplier_payment_difference']) <= 0.01
            && $checks['available_batches_missing_cost'] === 0;

        $json = json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $this->line($json);
        if ($path = $this->option('output')) {
            file_put_contents($path, $json . PHP_EOL);
        }

        return $checks['healthy'] ? self::SUCCESS : self::FAILURE;
    }

    private function moneyDiffers($actual, $expected): bool
    {
        return abs(round((float) $actual, 2) - round((float) $expected, 2)) > 0.01;
    }
}
