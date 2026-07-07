<?php

namespace App\Services;

use App\Models\CompanyPayable;
use App\Models\CustomerCompanyCreditStatus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use Illuminate\Support\Facades\DB;

class DashboardMetricService
{
    public function officeSummary(): array
    {
        $submittedOrderCount = SalesOrder::where('status', 'submitted')->count();
        $openInvoiceCount = Invoice::where('balance_amount', '>', 0)->count();
        $lowStockProductCount = $this->lowStockProductCount();
        $navActionCounts = $this->navActionCounts($openInvoiceCount, $lowStockProductCount);

        return [
            'pending_orders' => $submittedOrderCount,
            'unpaid_invoices' => $openInvoiceCount,
            'monthly_sales' => Invoice::whereMonth('invoice_date', now()->month)->sum('total_amount'),
            'low_stock_products' => $lowStockProductCount,
            'nav_action_counts' => $navActionCounts,
            'total_action_count' => $this->totalActionCount($navActionCounts),
            'alerts' => $this->operationalAlerts($navActionCounts),
            'top_products' => $this->topProducts(),
            'top_customers' => $this->topCustomers(),
            'top_representatives' => $this->topRepresentatives(),
        ];
    }

    public function salesRepresentativeSummary(int $salesRepresentativeId): array
    {
        return [
            'submitted_orders' => SalesOrder::where('sales_representative_id', $salesRepresentativeId)
                ->where('status', 'submitted')
                ->count(),
            'approved_orders' => SalesOrder::where('sales_representative_id', $salesRepresentativeId)
                ->where('status', 'approved')
                ->count(),
            'monthly_sales' => $this->salesInvoiceQuery()
                ->where('sales_representative_id', $salesRepresentativeId)
                ->whereMonth('invoice_date', now()->month)
                ->sum('total_amount'),
            'monthly_performance' => $this->monthlyPerformance($salesRepresentativeId),
        ];
    }

    private function navActionCounts(int $openInvoiceCount, int $lowStockProductCount): array
    {
        $openPayableCount = CompanyPayable::query()
            ->where('balance_amount', '>', 0)
            ->where('status', '!=', 'paid')
            ->count();
        $creditAttentionCount = CustomerCompanyCreditStatus::query()
            ->whereIn('credit_status', ['warning', 'blocked'])
            ->distinct('customer_id')
            ->count('customer_id');
        $ordersNeedingActionCount = SalesOrder::query()
            ->whereIn('status', ['submitted', 'approved', 'invoiced'])
            ->count();
        $receivingPaymentAttentionCount = StockReceipt::query()
            ->whereHas('payable', fn ($query) => $query
                ->where('balance_amount', '>', 0)
                ->where('status', '!=', 'paid'))
            ->count();

        return [
            'pharmacies' => $creditAttentionCount,
            'orders' => $ordersNeedingActionCount,
            'invoices' => $openInvoiceCount,
            'receivables' => $openInvoiceCount,
            'receiving' => $receivingPaymentAttentionCount,
            'inventory' => $lowStockProductCount,
            'payables' => $openPayableCount,
        ];
    }

    private function totalActionCount(array $navActionCounts): int
    {
        return (int) (
            ($navActionCounts['pharmacies'] ?? 0)
            + ($navActionCounts['orders'] ?? 0)
            + ($navActionCounts['receivables'] ?? 0)
            + ($navActionCounts['inventory'] ?? 0)
            + ($navActionCounts['payables'] ?? 0)
        );
    }

    private function operationalAlerts(array $navActionCounts): array
    {
        $alerts = [];
        $overdueReceivableCount = Invoice::query()
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<', now()->toDateString())
            ->count();
        $overduePayableCount = CompanyPayable::query()
            ->where('balance_amount', '>', 0)
            ->where('status', '!=', 'paid')
            ->whereDate('due_date', '<', now()->toDateString())
            ->count();

        if (($navActionCounts['orders'] ?? 0) > 0) {
            $alerts[] = [
                'title' => 'Orders need office action',
                'detail' => "{$navActionCounts['orders']} orders are waiting for approval, invoicing, or delivery.",
                'status' => 'Warning',
            ];
        }

        if ($overdueReceivableCount > 0) {
            $alerts[] = [
                'title' => 'Overdue receivables',
                'detail' => "{$overdueReceivableCount} customer invoices are past due.",
                'status' => 'Blocked',
            ];
        }

        if ($overduePayableCount > 0) {
            $alerts[] = [
                'title' => 'Overdue payables',
                'detail' => "{$overduePayableCount} supplier payables are past due.",
                'status' => 'Warning',
            ];
        }

        if (($navActionCounts['inventory'] ?? 0) > 0) {
            $alerts[] = [
                'title' => 'Low stock products',
                'detail' => "{$navActionCounts['inventory']} products are at or below their reorder threshold.",
                'status' => 'Warning',
            ];
        }

        if (($navActionCounts['pharmacies'] ?? 0) > 0) {
            $alerts[] = [
                'title' => 'Pharmacy credit attention',
                'detail' => "{$navActionCounts['pharmacies']} pharmacies have warning or blocked company credit.",
                'status' => 'Warning',
            ];
        }

        return array_slice($alerts, 0, 5);
    }

    private function lowStockProductCount(): int
    {
        return StockBatch::query()
            ->join('products', 'products.id', '=', 'stock_batches.product_id')
            ->select('stock_batches.product_id')
            ->groupBy('stock_batches.product_id')
            ->havingRaw('SUM(stock_batches.available_base_quantity) <= MAX(products.low_stock_threshold_base_units)')
            ->get()
            ->count();
    }

    private function topProducts(): array
    {
        return InvoiceItem::query()
            ->join('products', 'products.id', '=', 'invoice_items.product_id')
            ->join('companies', 'companies.id', '=', 'products.company_id')
            ->select([
                'products.name as product',
                'companies.name as company',
                DB::raw('SUM(invoice_items.line_total) as sales'),
                DB::raw('COUNT(DISTINCT invoice_items.invoice_id) as orders'),
            ])
            ->groupBy('products.id', 'products.name', 'companies.name')
            ->orderByDesc('sales')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'id' => "product-{$row->product}",
                'product' => $row->product,
                'company' => $row->company,
                'sales' => number_format((float) $row->sales),
                'orders' => (string) $row->orders,
                'status' => 'Active',
            ])
            ->values()
            ->all();
    }

    private function topCustomers(): array
    {
        return Invoice::query()
            ->join('customers', 'customers.id', '=', 'invoices.customer_id')
            ->select([
                'customers.name as pharmacy',
                DB::raw('SUM(invoices.total_amount) as sales'),
                DB::raw('SUM(invoices.balance_amount) as outstanding'),
                DB::raw('MAX(invoices.status) as status'),
            ])
            ->groupBy('customers.id', 'customers.name')
            ->orderByDesc('sales')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'id' => "customer-{$row->pharmacy}",
                'pharmacy' => $row->pharmacy,
                'sales' => number_format((float) $row->sales),
                'outstanding' => number_format((float) $row->outstanding),
                'status' => ucfirst(str_replace('_', ' ', (string) $row->status)),
            ])
            ->values()
            ->all();
    }

    private function topRepresentatives(): array
    {
        return $this->salesInvoiceQuery()
            ->join('sales_representatives', 'sales_representatives.id', '=', 'invoices.sales_representative_id')
            ->join('users', 'users.id', '=', 'sales_representatives.user_id')
            ->join('companies', 'companies.id', '=', 'sales_representatives.company_id')
            ->select([
                'users.name as rep',
                'companies.name as company',
                DB::raw('SUM(invoices.total_amount) as sales'),
                DB::raw('COUNT(invoices.id) as orders'),
            ])
            ->groupBy('sales_representatives.id', 'users.name', 'companies.name')
            ->orderByDesc('sales')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'id' => "rep-{$row->rep}",
                'rep' => $row->rep,
                'company' => $row->company,
                'sales' => number_format((float) $row->sales),
                'orders' => (string) $row->orders,
                'status' => 'Active',
            ])
            ->values()
            ->all();
    }

    private function monthlyPerformance(int $salesRepresentativeId): array
    {
        $months = collect(range(5, 0))->map(fn ($monthsAgo) => now()->copy()->startOfMonth()->subMonths($monthsAgo));
        $salesByMonth = $this->salesInvoiceQuery()
            ->where('sales_representative_id', $salesRepresentativeId)
            ->whereDate('invoice_date', '>=', $months->first()->toDateString())
            ->get(['invoice_date', 'total_amount'])
            ->groupBy(fn ($invoice) => $invoice->invoice_date?->format('Y-m'))
            ->map(fn ($invoices) => $invoices->sum('total_amount'));
        $ordersByMonth = SalesOrder::query()
            ->where('sales_representative_id', $salesRepresentativeId)
            ->where('status', '!=', 'cancelled')
            ->whereDate('order_date', '>=', $months->first()->toDateString())
            ->get(['order_date'])
            ->groupBy(fn ($order) => $order->order_date?->format('Y-m'))
            ->map(fn ($orders) => $orders->count());
        $maxSales = max(1, (float) $salesByMonth->max());
        $maxOrders = max(1, (int) $ordersByMonth->max());

        return $months->map(function ($month) use ($salesByMonth, $ordersByMonth, $maxSales, $maxOrders) {
            $key = $month->format('Y-m');
            $sales = (float) ($salesByMonth[$key] ?? 0);
            $orders = (int) ($ordersByMonth[$key] ?? 0);

            return [
                'label' => $month->format('M'),
                'sales' => number_format($sales),
                'orders' => (string) $orders,
                'salesPercent' => (int) round($sales / $maxSales * 100),
                'orderPercent' => (int) round($orders / $maxOrders * 100),
            ];
        })->all();
    }

    private function salesInvoiceQuery()
    {
        return Invoice::query()
            ->where('invoices.status', '!=', 'void')
            ->where(function ($query) {
                $query->whereNull('invoices.sales_order_id')
                    ->orWhereHas('salesOrder', fn ($orderQuery) => $orderQuery
                        ->withTrashed()
                        ->where('status', '!=', 'cancelled'));
            });
    }
}
