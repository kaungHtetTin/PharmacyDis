<?php

namespace App\Http\Controllers\Office;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceReportController extends Controller
{
    public function __invoke(Request $request)
    {
        $dateFrom = $request->filled('date_from')
            ? $request->date('date_from')->toDateString()
            : now()->startOfMonth()->toDateString();
        $dateTo = $request->filled('date_to')
            ? $request->date('date_to')->toDateString()
            : now()->endOfMonth()->toDateString();

        $invoices = Invoice::query()
            ->with(['company:id,name', 'customer:id,name'])
            ->when(! $request->filled('status'), fn ($query) => $query->where('status', '!=', 'void'))
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->customer_id))
            ->when($request->filled('status'), function ($query) use ($request) {
                if ($request->status === 'inconsistent') {
                    $query->where(function ($integrity) {
                        $integrity->whereRaw('ABS(net_collectible_amount - GREATEST(0, COALESCE(NULLIF(original_total_amount, 0), total_amount) - cash_back_amount - return_credit_amount)) > 0.01')
                            ->orWhereRaw('ABS(balance_amount - GREATEST(0, net_collectible_amount - paid_amount)) > 0.01')
                            ->orWhere(fn ($falsePaid) => $falsePaid->where('status', 'paid')->where('paid_amount', '<=', 0));
                    });
                    return;
                }
                $query->where(function ($statusQuery) use ($request) {
                    $statusQuery->where('status', $request->status)
                        ->orWhere('settlement_status', $request->status);
                });
            })
            ->whereDate('invoice_date', '>=', $dateFrom)
            ->whereDate('invoice_date', '<=', $dateTo)
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->query('search'));

                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('salesOrder', fn ($orderQuery) => $orderQuery->where('order_no', 'like', "%{$search}%"));
                });
            })
            ->orderBy('invoice_date')
            ->orderBy('invoice_no')
            ->get();

        $filterCompany = $request->filled('company_id')
            ? Company::query()->select(['id', 'name'])->find($request->integer('company_id'))
            : null;

        return view('office.invoices.report', [
            'filterCompany' => $filterCompany,
            'filters' => array_merge($request->only(['search', 'company_id', 'customer_id', 'status']), [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ]),
            'invoices' => $invoices,
        ]);
    }
}
