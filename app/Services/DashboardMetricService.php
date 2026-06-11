<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Models\StockBatch;

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
        ];
    }
}
