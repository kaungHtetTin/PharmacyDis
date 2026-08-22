<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialReportService
{
    public function periodSnapshot(CarbonInterface $start, CarbonInterface $end, $companyId = null): array
    {
        $from = $start->toDateString();
        $to = $end->toDateString();
        $invoicePeriod = $this->activeInvoices($companyId)
            ->whereBetween('invoice_date', [$from, $to]);
        $grossSales = (float) (clone $invoicePeriod)
            ->sum(DB::raw('COALESCE(NULLIF(original_total_amount, 0), total_amount)'));
        $invoiceCount = (int) (clone $invoicePeriod)->count();

        $cashBackQuery = $this->activeInvoices($companyId)
            ->where('cash_back_amount', '>', 0)
            ->where(function ($query) use ($from, $to) {
                $query->whereBetween(DB::raw('DATE(cash_back_approved_at)'), [$from, $to])
                    ->orWhere(function ($legacy) use ($from, $to) {
                        $legacy->whereNull('cash_back_approved_at')->whereBetween('invoice_date', [$from, $to]);
                    });
            });
        $cashBack = (float) $cashBackQuery->sum('cash_back_amount');

        $returnQuery = DB::table('sales_returns')
            ->join('invoices', 'invoices.id', '=', 'sales_returns.invoice_id')
            ->whereNull('sales_returns.deleted_at')->where('sales_returns.status', 'posted')
            ->whereNull('invoices.deleted_at')->where('invoices.status', '!=', 'void')
            ->where(function ($query) {
                $query->whereNull('invoices.sales_order_id')
                    ->orWhereNotExists(fn ($orders) => $orders->selectRaw('1')
                        ->from('sales_orders')
                        ->whereColumn('sales_orders.id', 'invoices.sales_order_id')
                        ->where('sales_orders.status', 'cancelled'));
            })
            ->whereBetween('sales_returns.return_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('sales_returns.company_id', $companyId));
        $returnCredits = (float) (clone $returnQuery)->sum('sales_returns.total_amount');

        $receivableAsOf = $this->receivableAsOf($to, $companyId);
        $commissionGross = (float) DB::table('sales_order_items')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_items.sales_order_id')
            ->join('invoices', 'invoices.sales_order_id', '=', 'sales_orders.id')
            ->whereNull('invoices.deleted_at')->where('invoices.status', '!=', 'void')
            ->where('sales_orders.status', '!=', 'cancelled')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('invoices.company_id', $companyId))
            ->sum('sales_order_items.commission_amount');
        $commissionReversed = (float) DB::table('sales_return_commission_adjustments as ca')
            ->join('sales_returns as sr', 'sr.id', '=', 'ca.sales_return_id')
            ->join('invoices as i', 'i.id', '=', 'sr.invoice_id')
            ->where('ca.status', 'posted')->where('sr.status', 'posted')->whereNull('sr.deleted_at')
            ->whereNull('i.deleted_at')->where('i.status', '!=', 'void')
            ->where(function ($query) {
                $query->whereNull('i.sales_order_id')
                    ->orWhereNotExists(fn ($orders) => $orders->selectRaw('1')
                        ->from('sales_orders')
                        ->whereColumn('sales_orders.id', 'i.sales_order_id')
                        ->where('sales_orders.status', 'cancelled'));
            })
            ->whereBetween('sr.return_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('sr.company_id', $companyId))
            ->sum('ca.reversal_amount');
        $customerPayments = (float) DB::table('payments')->whereNull('deleted_at')
            ->whereBetween('payment_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->sum('amount');
        $supplierPayments = (float) DB::table('company_payments')->whereNull('deleted_at')
            ->whereBetween('payment_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->sum('amount');
        $customerCredits = (float) DB::table('customer_credits')
            ->where('status', 'available')
            ->whereDate('credit_date', '<=', $to)
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->sum('available_amount');
        $customerCharges = (float) DB::table('customer_charge_adjustments')
            ->where('status', 'posted')
            ->whereBetween('adjustment_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->sum('amount');
        $openingReceivable = $this->receivableAsOf($start->copy()->subDay()->toDateString(), $companyId);
        $collectibleAvailable = max(
            0,
            $openingReceivable + $grossSales + $customerCharges - $returnCredits - $cashBack
        );
        $collectionRate = $collectibleAvailable > 0
            ? min(100, max(0, ($customerPayments / $collectibleAvailable) * 100))
            : 0;

        return [
            'gross_sales' => round($grossSales, 2),
            'invoice_count' => $invoiceCount,
            'return_credits' => round($returnCredits, 2),
            'return_count' => (int) (clone $returnQuery)->count(),
            'cash_back' => round($cashBack, 2),
            'net_sales' => round($grossSales - $returnCredits - $cashBack, 2),
            'receivable_as_of' => round($receivableAsOf, 2),
            'opening_receivable' => round($openingReceivable, 2),
            'collectible_available' => round($collectibleAvailable, 2),
            'collection_rate' => round($collectionRate, 1),
            'payable_as_of' => round($this->payableAsOf($to, $companyId), 2),
            'commission_gross' => round($commissionGross, 2),
            'commission_reversed' => round($commissionReversed, 2),
            'commission_net' => round($commissionGross - $commissionReversed, 2),
            'customer_payments' => round($customerPayments, 2),
            'supplier_payments' => round($supplierPayments, 2),
            'customer_credit_liability' => round($customerCredits, 2),
            'customer_charge_adjustments' => round($customerCharges, 2),
        ];
    }

    public function stockCostCoverage($companyId = null): array
    {
        $query = DB::table('stock_batches')->where('available_base_quantity', '>', 0)
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));

        return [
            'unresolved_batch_count' => (int) (clone $query)->whereNull('base_unit_cost')->count(),
            'unresolved_base_units' => (int) (clone $query)->whereNull('base_unit_cost')->sum('available_base_quantity'),
            'resolved_value' => round((float) (clone $query)->whereNotNull('base_unit_cost')
                ->sum(DB::raw('available_base_quantity * base_unit_cost')), 2),
        ];
    }

    public function receivableAsOf(string $date, $companyId = null): float
    {
        return (float) $this->receivableBalancesAsOf($date, $companyId)->sum('balance');
    }

    public function receivableBalancesAsOf(string $date, $companyId = null): Collection
    {
        $returnTotals = DB::table('sales_returns')
            ->whereNull('deleted_at')
            ->where('status', 'posted')
            ->whereDate('return_date', '<=', $date)
            ->selectRaw('invoice_id, SUM(total_amount) as return_total')
            ->groupBy('invoice_id');
        $paymentTotals = DB::table('payment_allocations as pa')
            ->join('payments as p', 'p.id', '=', 'pa.payment_id')
            ->whereNull('p.deleted_at')
            ->whereDate('p.payment_date', '<=', $date)
            ->selectRaw('pa.invoice_id, SUM(pa.allocated_amount) as payment_total')
            ->groupBy('pa.invoice_id');
        $chargeTotals = DB::table('customer_charge_adjustments')
            ->where('status', 'posted')
            ->whereNotNull('invoice_id')
            ->whereDate('adjustment_date', '<=', $date)
            ->selectRaw('invoice_id, SUM(amount) as charge_total')
            ->groupBy('invoice_id');

        $balances = DB::table('invoices as i')
            ->leftJoinSub($returnTotals, 'rt', 'rt.invoice_id', '=', 'i.id')
            ->leftJoinSub($paymentTotals, 'pt', 'pt.invoice_id', '=', 'i.id')
            ->leftJoinSub($chargeTotals, 'ct', 'ct.invoice_id', '=', 'i.id')
            ->whereNull('i.deleted_at')
            ->where('i.status', '!=', 'void')
            ->where(function ($query) {
                $query->whereNull('i.sales_order_id')
                    ->orWhereNotExists(fn ($orders) => $orders->selectRaw('1')
                        ->from('sales_orders')
                        ->whereColumn('sales_orders.id', 'i.sales_order_id')
                        ->where('sales_orders.status', 'cancelled'));
            })
            ->whereDate('i.invoice_date', '<=', $date)
            ->when($companyId, fn ($query) => $query->where('i.company_id', $companyId))
            ->select([
                'i.id as invoice_id',
                'i.company_id',
                'i.customer_id',
                DB::raw('COALESCE(NULLIF(i.original_total_amount, 0), i.total_amount) as original_total'),
                DB::raw('COALESCE(rt.return_total, 0) as return_total'),
                DB::raw('COALESCE(pt.payment_total, 0) as payment_total'),
                DB::raw('COALESCE(ct.charge_total, 0) as charge_total'),
            ])
            ->selectRaw('CASE WHEN i.cash_back_amount > 0 AND (i.cash_back_approved_at IS NULL OR DATE(i.cash_back_approved_at) <= ?) THEN i.cash_back_amount ELSE 0 END as cash_back_total', [$date])
            ->get()
            ->map(fn ($row) => [
                'invoice_id' => (int) $row->invoice_id,
                'company_id' => (int) $row->company_id,
                'customer_id' => (int) $row->customer_id,
                'balance' => round(max(
                    0,
                    (float) $row->original_total
                        + (float) $row->charge_total
                        - (float) $row->cash_back_total
                        - (float) $row->return_total
                        - (float) $row->payment_total
                ), 2),
            ]);

        $unlinkedCharges = DB::table('customer_charge_adjustments')
            ->where('status', 'posted')
            ->whereNull('invoice_id')
            ->whereDate('adjustment_date', '<=', $date)
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->selectRaw('company_id, customer_id, SUM(amount) as balance')
            ->groupBy('company_id', 'customer_id')
            ->get()
            ->map(fn ($row) => [
                'invoice_id' => null,
                'company_id' => (int) $row->company_id,
                'customer_id' => (int) $row->customer_id,
                'balance' => round(max(0, (float) $row->balance), 2),
            ]);

        return $balances->concat($unlinkedCharges)->values();
    }

    public function payableAsOf(string $date, $companyId = null): float
    {
        $paymentTotals = DB::table('company_payments')
            ->whereNull('deleted_at')
            ->whereNotNull('company_payable_id')
            ->whereDate('payment_date', '<=', $date)
            ->selectRaw('company_payable_id, SUM(amount) as payment_total')
            ->groupBy('company_payable_id');

        return (float) DB::table('company_payables as cp')
            ->leftJoinSub($paymentTotals, 'pt', 'pt.company_payable_id', '=', 'cp.id')
            ->whereNull('cp.deleted_at')
            ->whereDate('cp.payable_date', '<=', $date)
            ->when($companyId, fn ($query) => $query->where('cp.company_id', $companyId))
            ->sum(DB::raw('GREATEST(0, cp.amount - COALESCE(pt.payment_total, 0))'));
    }

    private function activeInvoices($companyId): Builder
    {
        return DB::table('invoices')->whereNull('deleted_at')->where('status', '!=', 'void')
            ->where(function ($query) {
                $query->whereNull('invoices.sales_order_id')
                    ->orWhereNotExists(fn ($orders) => $orders->selectRaw('1')
                        ->from('sales_orders')
                        ->whereColumn('sales_orders.id', 'invoices.sales_order_id')
                        ->where('sales_orders.status', 'cancelled'));
            })
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));
    }
}
