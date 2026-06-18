<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFinanceTransactionRequest;
use App\Http\Requests\StoreCompanyPaymentRequest;
use App\Http\Resources\FinanceTransactionResource;
use App\Models\CompanyPayable;
use App\Models\CompanyPayment;
use App\Models\FinanceTransaction;
use App\Models\Invoice;
use App\Services\NumberGeneratorService;
use App\Services\CompanyPaymentService;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function transactions(Request $request)
    {
        $query = FinanceTransaction::query()
            ->with(['creator:id,name'])
            ->when($request->filled('direction'), fn ($query) => $query->where('direction', $request->direction))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('payment_method'), fn ($query) => $query->where('payment_method', $request->payment_method))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('from_date'), fn ($query) => $query->whereDate('transaction_date', '>=', $request->from_date))
            ->when($request->filled('to_date'), fn ($query) => $query->whereDate('transaction_date', '<=', $request->to_date))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($query) use ($search) {
                    $query->where('transaction_no', 'like', "%{$search}%")
                        ->orWhere('reference_no', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest('transaction_date')
            ->latest('id');

        $summaryQuery = clone $query;
        $paginated = $query->paginate($request->integer('per_page', 15));

        return FinanceTransactionResource::collection($paginated)->additional([
            'summary' => [
                'transaction_count' => (clone $summaryQuery)->count(),
                'income_amount' => (float) (clone $summaryQuery)->where('direction', 'income')->where('status', 'recorded')->sum('amount'),
                'outcome_amount' => (float) (clone $summaryQuery)->where('direction', 'outcome')->where('status', 'recorded')->sum('amount'),
                'void_count' => (clone $summaryQuery)->where('status', 'void')->count(),
            ],
        ]);
    }

    public function storeTransaction(
        StoreFinanceTransactionRequest $request,
        NumberGeneratorService $numberGeneratorService
    ) {
        $data = $request->validated();

        $transaction = FinanceTransaction::create([
            'transaction_no' => $numberGeneratorService->next(FinanceTransaction::class, 'transaction_no', 'FIN'),
            'direction' => $data['direction'],
            'category' => $data['category'],
            'company_id' => null,
            'transaction_date' => $data['transaction_date'] ?? now()->toDateString(),
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'] ?? 'cash',
            'reference_no' => $data['reference_no'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'recorded',
            'created_by' => $request->user()?->id,
        ]);

        return (new FinanceTransactionResource($transaction->fresh(['creator'])))->response()->setStatusCode(201);
    }

    public function updateTransaction(StoreFinanceTransactionRequest $request, FinanceTransaction $financeTransaction)
    {
        $data = $request->validated();

        $financeTransaction->update([
            'direction' => $data['direction'],
            'category' => $data['category'],
            'company_id' => null,
            'transaction_date' => $data['transaction_date'] ?? now()->toDateString(),
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'] ?? 'cash',
            'reference_no' => $data['reference_no'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'recorded',
        ]);

        return new FinanceTransactionResource($financeTransaction->fresh(['creator']));
    }

    public function destroyTransaction(FinanceTransaction $financeTransaction)
    {
        $financeTransaction->delete();

        return response()->noContent();
    }

    public function receivables(Request $request)
    {
        $query = Invoice::query()
            ->with(['company:id,name', 'customer:id,name,phone', 'salesOrder:id,order_no', 'allocations.payment'])
            ->when($request->boolean('action_only', true), fn ($query) => $query->where('balance_amount', '>', 0))
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
            ->when($request->boolean('action_only'), fn ($query) => $query
                ->where('balance_amount', '>', 0)
                ->where('status', '!=', 'paid'))
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

    public function payableDetail(CompanyPayable $companyPayable)
    {
        return $companyPayable->load(['company:id,name', 'stockReceipt:id,receipt_no,supplier_invoice_no', 'payments']);
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
