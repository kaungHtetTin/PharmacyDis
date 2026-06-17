<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function detail(Request $request, Customer $customer)
    {
        $salesRepresentative = $request->user()->salesRepresentative;

        abort_if(!$salesRepresentative, 403, 'Sales representative profile is required.');

        $companyId = $salesRepresentative->company_id;

        $customer->load([
            'creditStatuses' => fn ($query) => $query->where('company_id', $companyId)->with('company'),
        ]);

        $orders = $customer->salesOrders()
            ->with(['company:id,name', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule', 'salesRepresentative.user:id,name'])
            ->where('company_id', $companyId)
            ->latest('order_date')
            ->limit(25)
            ->get();

        $invoices = $customer->invoices()
            ->with(['company:id,name', 'salesOrder:id,order_no', 'allocations.payment'])
            ->where('company_id', $companyId)
            ->latest('invoice_date')
            ->limit(25)
            ->get();

        $payments = $customer->payments()
            ->with(['company:id,name', 'allocations.invoice'])
            ->where('company_id', $companyId)
            ->latest('payment_date')
            ->limit(25)
            ->get();

        $monthlySales = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('company_id', $companyId)
            ->whereYear('invoice_date', now()->year)
            ->whereMonth('invoice_date', now()->month)
            ->sum('total_amount');

        return response()->json([
            'customer' => $customer,
            'company' => $salesRepresentative->company,
            'credit_status' => $customer->creditStatuses->first(),
            'orders' => $orders,
            'invoices' => $invoices,
            'payments' => $payments,
            'summary' => [
                'monthly_sales' => (float) $monthlySales,
                'monthly_order_count' => $orders
                    ->where('order_date', '>=', now()->startOfMonth())
                    ->count(),
                'outstanding' => (float) $invoices->sum('balance_amount'),
                'invoice_count' => $invoices->count(),
                'unpaid_invoice_count' => $invoices->where('balance_amount', '>', 0)->count(),
                'last_order_date' => optional($orders->first()?->order_date)->toDateString(),
                'last_order_no' => $orders->first()?->order_no,
            ],
        ]);
    }
}
