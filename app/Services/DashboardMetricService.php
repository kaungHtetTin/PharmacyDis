<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\StockBatch;
use Illuminate\Support\Facades\DB;

class DashboardMetricService
{
    public function officeSummary(): array
    {
        return [
            'pending_orders' => SalesOrder::where('status', 'submitted')->count(),
            'unpaid_invoices' => Invoice::whereIn('status', ['issued', 'partial'])->count(),
            'monthly_sales' => Invoice::whereMonth('invoice_date', now()->month)->sum('total_amount'),
            'low_stock_products' => StockBatch::query()
                ->select('product_id')
                ->groupBy('product_id')
                ->havingRaw('SUM(available_base_quantity) <= 0')
                ->count(),
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
            'monthly_sales' => Invoice::where('sales_representative_id', $salesRepresentativeId)
                ->whereMonth('invoice_date', now()->month)
                ->sum('total_amount'),
            'monthly_performance' => $this->monthlyPerformance($salesRepresentativeId),
        ];
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
        return Invoice::query()
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
        $salesByMonth = Invoice::query()
            ->where('sales_representative_id', $salesRepresentativeId)
            ->whereDate('invoice_date', '>=', $months->first()->toDateString())
            ->get(['invoice_date', 'total_amount'])
            ->groupBy(fn ($invoice) => $invoice->invoice_date?->format('Y-m'))
            ->map(fn ($invoices) => $invoices->sum('total_amount'));
        $ordersByMonth = SalesOrder::query()
            ->where('sales_representative_id', $salesRepresentativeId)
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
}
