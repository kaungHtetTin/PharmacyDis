<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSalesReturnRequest;
use App\Http\Resources\SalesReturnResource;
use App\Models\SalesReturn;
use App\Models\SalesReturnCommissionAdjustment;
use App\Models\SalesReturnFocItem;
use App\Services\SalesReturnService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesReturnController extends Controller
{
    public function index(Request $request)
    {
        $returns = SalesReturn::query()
            ->with([
                'company:id,name,code',
                'customer:id,name,code,phone',
                'warehouse:id,name,code',
                'invoice:id,invoice_no,total_amount,paid_amount,balance_amount,status',
                'salesOrder:id,order_no',
                'items.product:id,name,sku',
                'items.unit:id,name,abbreviation',
                'focItems.product:id,name,sku',
                'focItems.approver:id,name',
                'focItems.chargeAdjustment',
                'commissionAdjustments',
            ])
            ->withCount('items')
            ->when($request->filled('company_id'), fn ($query) => $query->where('sales_returns.company_id', $request->company_id))
            ->when($request->filled('customer_id'), fn ($query) => $query->where('sales_returns.customer_id', $request->customer_id))
            ->when($request->filled('status'), fn ($query) => $query->where('sales_returns.status', $request->status))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('sales_returns.return_date', '>=', $request->date('date_from')->toDateString()))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('sales_returns.return_date', '<=', $request->date('date_to')->toDateString()))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->input('search'));

                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('sales_returns.return_no', 'like', "%{$search}%")
                        ->orWhereHas('invoice', fn ($invoiceQuery) => $invoiceQuery->where('invoice_no', 'like', "%{$search}%"))
                        ->orWhereHas('salesOrder', fn ($orderQuery) => $orderQuery->where('order_no', 'like', "%{$search}%"))
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"))
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
                });
            })
            ->latest('sales_returns.return_date')
            ->latest('sales_returns.id');

        $summaryQuery = clone $returns;
        $paginated = $returns->paginate($request->integer('per_page', 15));

        return SalesReturnResource::collection($paginated)->additional([
            'summary' => [
                'return_count' => (clone $summaryQuery)->count(),
                'return_amount' => (float) (clone $summaryQuery)->sum('sales_returns.total_amount'),
                'payment_amount' => (float) (clone $summaryQuery)
                    ->join('invoices', 'invoices.id', '=', 'sales_returns.invoice_id')
                    ->sum(DB::raw('invoices.paid_amount')),
            ],
        ]);
    }

    public function store(StoreSalesReturnRequest $request, SalesReturnService $salesReturnService)
    {
        return response()->json($salesReturnService->post($request->validated(), $request->user()), 201);
    }

    public function void(Request $request, SalesReturn $salesReturn, SalesReturnService $salesReturnService)
    {
        abort_unless(in_array($request->user()?->role?->name, ['admin', 'super_admin'], true), 403, 'Only an administrator can void a posted return.');
        $validated = $request->validate(['reason' => ['required', 'string', 'max:2000']]);

        return new SalesReturnResource($salesReturnService->void($salesReturn, $request->user(), $validated['reason']));
    }

    public function resolveFoc(Request $request, SalesReturnFocItem $salesReturnFocItem, SalesReturnService $salesReturnService)
    {
        $validated = $request->validate([
            'disposition' => ['required', 'in:returned,charged,waived'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        return response()->json($salesReturnService->resolveHistoricalFoc($salesReturnFocItem, $validated, $request->user()));
    }

    public function reviewCommission(Request $request, SalesReturnCommissionAdjustment $commissionAdjustment, SalesReturnService $salesReturnService)
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        return response()->json($salesReturnService->approveHistoricalCommission($commissionAdjustment, $validated, $request->user()));
    }
}
