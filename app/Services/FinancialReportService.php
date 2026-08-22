<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
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
            ->whereNull('sales_returns.deleted_at')->where('sales_returns.status', 'posted')
            ->whereBetween('sales_returns.return_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('sales_returns.company_id', $companyId));
        $returnCredits = (float) (clone $returnQuery)->sum('sales_returns.total_amount');

        $receivableAsOf = $this->receivableAsOf($to, $companyId);
        $commissionGross = (float) DB::table('sales_order_items')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_items.sales_order_id')
            ->join('invoices', 'invoices.sales_order_id', '=', 'sales_orders.id')
            ->whereNull('invoices.deleted_at')->where('invoices.status', '!=', 'void')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->when($companyId, fn ($query) => $query->where('invoices.company_id', $companyId))
            ->sum('sales_order_items.commission_amount');
        $commissionReversed = (float) DB::table('sales_return_commission_adjustments as ca')
            ->join('sales_returns as sr', 'sr.id', '=', 'ca.sales_return_id')
            ->where('ca.status', 'posted')->where('sr.status', 'posted')->whereNull('sr.deleted_at')
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

        return [
            'gross_sales' => round($grossSales, 2),
            'invoice_count' => $invoiceCount,
            'return_credits' => round($returnCredits, 2),
            'return_count' => (int) (clone $returnQuery)->count(),
            'cash_back' => round($cashBack, 2),
            'net_sales' => round($grossSales - $returnCredits - $cashBack, 2),
            'receivable_as_of' => round($receivableAsOf, 2),
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

    private function receivableAsOf(string $date, $companyId): float
    {
        $gross = (float) $this->activeInvoices($companyId)->whereDate('invoice_date', '<=', $date)
            ->sum(DB::raw('COALESCE(NULLIF(original_total_amount, 0), total_amount)'));
        $cashBack = (float) $this->activeInvoices($companyId)->where('cash_back_amount', '>', 0)
            ->where(function ($query) use ($date) {
                $query->whereDate('cash_back_approved_at', '<=', $date)
                    ->orWhere(function ($legacy) use ($date) {
                        $legacy->whereNull('cash_back_approved_at')->whereDate('invoice_date', '<=', $date);
                    });
            })->sum('cash_back_amount');
        $returns = (float) DB::table('sales_returns as sr')
            ->join('invoices as i', 'i.id', '=', 'sr.invoice_id')
            ->whereNull('sr.deleted_at')->where('sr.status', 'posted')
            ->whereNull('i.deleted_at')->where('i.status', '!=', 'void')
            ->whereDate('sr.return_date', '<=', $date)
            ->when($companyId, fn ($query) => $query->where('sr.company_id', $companyId))
            ->sum('sr.total_amount');
        $payments = (float) DB::table('payment_allocations as pa')
            ->join('payments as p', 'p.id', '=', 'pa.payment_id')
            ->join('invoices as i', 'i.id', '=', 'pa.invoice_id')
            ->whereNull('p.deleted_at')->whereNull('i.deleted_at')->where('i.status', '!=', 'void')
            ->whereDate('p.payment_date', '<=', $date)
            ->when($companyId, fn ($query) => $query->where('i.company_id', $companyId))
            ->sum('pa.allocated_amount');
        $charges = (float) DB::table('customer_charge_adjustments')
            ->where('status', 'posted')
            ->whereDate('adjustment_date', '<=', $date)
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->sum('amount');

        return max(0, $gross + $charges - $cashBack - $returns - $payments);
    }

    private function activeInvoices($companyId): Builder
    {
        return DB::table('invoices')->whereNull('deleted_at')->where('status', '!=', 'void')
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));
    }
}
