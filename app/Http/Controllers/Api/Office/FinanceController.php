<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCompanyPaymentRequest;
use App\Models\CompanyPayable;
use App\Models\CompanyPayment;
use App\Models\Invoice;
use App\Services\CompanyPaymentService;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function receivables(Request $request)
    {
        $query = Invoice::query()
            ->with(['company:id,name', 'customer:id,name,phone', 'salesOrder:id,order_no', 'allocations.payment'])
            ->where('balance_amount', '>', 0)
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->customer_id))
            ->when($request->filled('status'), function ($query) use ($request) {
                if ($request->status === 'overdue') {
                    $query->where('status', '!=', 'paid')
                        ->whereDate('due_date', '<', now()->toDateString());
                    return;
                }

                $query->where('status', $request->status);
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($query) use ($search) {
                    $query->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($request->input('aging') === 'overdue', fn ($query) => $query->whereDate('due_date', '<', now()->toDateString()))
            ->when($request->input('aging') === 'due_soon', fn ($query) => $query->whereBetween('due_date', [now()->toDateString(), now()->addDays(7)->toDateString()]))
            ->latest('due_date');

        $summaryQuery = clone $query;
        $paginated = $query->paginate($request->integer('per_page', 15));

        return response()->json(array_merge($paginated->toArray(), [
            'summary' => [
                'invoice_count' => (clone $summaryQuery)->count(),
                'receivable_amount' => (float) (clone $summaryQuery)->sum('balance_amount'),
                'overdue_amount' => (float) (clone $summaryQuery)->whereDate('due_date', '<', now()->toDateString())->sum('balance_amount'),
            ],
        ]));
    }

    public function payables(Request $request)
    {
        $query = CompanyPayable::query()
            ->with(['company:id,name', 'stockReceipt:id,receipt_no,supplier_invoice_no', 'payments'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('status'), function ($query) use ($request) {
                if ($request->status === 'overdue') {
                    $query->where('status', '!=', 'paid')
                        ->whereDate('due_date', '<', now()->toDateString());
                    return;
                }

                $query->where('status', $request->status);
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($query) use ($search) {
                    $query->whereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('stockReceipt', function ($receiptQuery) use ($search) {
                            $receiptQuery->where('receipt_no', 'like', "%{$search}%")
                                ->orWhere('supplier_invoice_no', 'like', "%{$search}%");
                        });
                });
            })
            ->latest('due_date');

        $summaryQuery = clone $query;
        $paginated = $query->paginate($request->integer('per_page', 15));

        return response()->json(array_merge($paginated->toArray(), [
            'summary' => [
                'payable_count' => (clone $summaryQuery)->count(),
                'payable_amount' => (float) (clone $summaryQuery)->sum('balance_amount'),
                'overdue_amount' => (float) (clone $summaryQuery)
                    ->where('status', '!=', 'paid')
                    ->whereDate('due_date', '<', now()->toDateString())
                    ->sum('balance_amount'),
            ],
        ]));
    }

    public function companyPayments(Request $request)
    {
        return CompanyPayment::query()
            ->with(['company:id,name', 'payable.stockReceipt:id,receipt_no,supplier_invoice_no'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->latest('payment_date')
            ->paginate($request->integer('per_page', 15));
    }

    public function recordCompanyPayment(
        StoreCompanyPaymentRequest $request,
        CompanyPaymentService $companyPaymentService
    ) {
        $payment = $companyPaymentService->record($request->validated(), $request->user());

        return response()->json($payment, 201);
    }
}
