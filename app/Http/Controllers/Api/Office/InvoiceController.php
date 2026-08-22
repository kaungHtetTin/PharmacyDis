<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Services\CustomerBalanceService;
use App\Services\InvoiceService;
use App\Services\InvoiceSettlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $invoices = Invoice::query()
            ->with([
                'company',
                'customer',
                'salesOrder.company',
                'salesOrder.customer',
                'salesOrder.salesRepresentative.user',
                'salesOrder.items.product',
                'salesOrder.items.unit',
                'salesOrder.items.focUnit',
                'salesOrder.focItems.product',
                'salesOrder.focItems.focRule',
                'items.product',
                'items.unit',
                'items.salesReturnItems.salesReturn',
                'allocations.payment',
                'salesReturns.items.product',
                'salesReturns.focItems.product',
                'salesReturns.focItems.chargeAdjustment',
                'customerCredits',
                'customerChargeAdjustments',
            ])
            ->when($request->filled('invoice_id'), fn ($query) => $query->whereKey($request->integer('invoice_id')))
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
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('invoice_date', '>=', $request->date('date_from')->toDateString()))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('invoice_date', '<=', $request->date('date_to')->toDateString()))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->input('search'));

                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery
                        ->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('salesOrder', fn ($orderQuery) => $orderQuery->where('order_no', 'like', "%{$search}%"));
                });
            })
            ->when($request->boolean('action_only'), fn ($query) => $query
                ->where('balance_amount', '>', 0)
                ->where('status', '!=', 'void'))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return InvoiceResource::collection($invoices);
    }

    public function generateFromOrder(Request $request, SalesOrder $salesOrder, InvoiceService $invoiceService)
    {
        $validated = $request->validate([
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $invoice = $invoiceService->generateFromOrder(
            $salesOrder,
            $request->user(),
            taxAmount: array_key_exists('tax_amount', $validated) ? (float) $validated['tax_amount'] : null
        );

        return new InvoiceResource($invoice);
    }

    public function updateRemark(
        Request $request,
        Invoice $invoice,
        CustomerBalanceService $customerBalanceService,
        InvoiceSettlementService $invoiceSettlementService
    )
    {
        $validated = $request->validate([
            'due_date' => ['nullable', 'date'],
            'remark' => ['nullable', 'string', 'max:2000'],
            'sale_type' => ['nullable', 'string', 'in:cash,credit'],
            'cash_back_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $updatedInvoice = DB::transaction(function () use ($customerBalanceService, $invoice, $invoiceSettlementService, $request, $validated) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
            $invoiceUpdates = [];

            if (array_key_exists('due_date', $validated)) {
                $invoiceUpdates['due_date'] = $validated['due_date'];
            }

            if (array_key_exists('remark', $validated)) {
                $invoiceUpdates['remark'] = $validated['remark'];
            }

            if (array_key_exists('sale_type', $validated)) {
                $invoiceUpdates['sale_type'] = $validated['sale_type'] ?? 'cash';
            }

            if (array_key_exists('cash_back_amount', $validated)) {
                if (! $request->user()?->hasPermission('office.finance')) {
                    abort(403, 'Cash-back approval requires finance permission.');
                }
                if ($invoice->status === 'void') {
                    throw ValidationException::withMessages([
                        'cash_back_amount' => 'Void invoices cannot receive cash back adjustments.',
                    ]);
                }

                $cashBackAmount = round((float) ($validated['cash_back_amount'] ?? 0), 2);
                $settlement = $invoiceSettlementService->preview($invoice);
                $cashBackLimit = round(max(0, (float) $settlement['original_total_amount'] - (float) $settlement['return_credit_amount']), 2);

                if ($cashBackAmount > $cashBackLimit) {
                    throw ValidationException::withMessages([
                        'cash_back_amount' => 'Cash back amount cannot exceed the invoice total amount.',
                    ]);
                }

                $invoiceUpdates['cash_back_amount'] = $cashBackAmount;
                $invoiceUpdates['cash_back_approved_at'] = now();
                $invoiceUpdates['cash_back_approved_by'] = $request->user()?->id;
            }

            if ($invoiceUpdates !== []) {
                $invoice->update($invoiceUpdates);
            }

            if (array_key_exists('due_date', $invoiceUpdates) && $invoice->sales_order_id) {
                $invoice->salesOrder()->update(['payment_due_date' => $invoiceUpdates['due_date']]);
            }

            if (array_key_exists('cash_back_amount', $invoiceUpdates)) {
                $invoice = $invoiceSettlementService->recalculate($invoice, $request->user());
                $customerBalanceService->refresh((int) $invoice->customer_id, (int) $invoice->company_id);
            }

            return $invoice;
        });

        return new InvoiceResource($updatedInvoice->fresh([
            'company',
            'customer',
            'salesOrder.company',
            'salesOrder.customer',
            'salesOrder.salesRepresentative.user',
            'salesOrder.items.product',
            'salesOrder.items.unit',
            'salesOrder.items.focUnit',
            'salesOrder.focItems.product',
            'salesOrder.focItems.focRule',
            'items.product',
            'items.unit',
            'items.salesReturnItems.salesReturn',
            'allocations.payment',
            'salesReturns.items.product',
            'salesReturns.focItems.product',
        ]));
    }
}
