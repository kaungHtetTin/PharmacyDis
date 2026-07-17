<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Services\CustomerBalanceService;
use App\Services\InvoiceService;
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
                'allocations.payment',
            ])
            ->when($request->filled('invoice_id'), fn ($query) => $query->whereKey($request->integer('invoice_id')))
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->customer_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
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
                ->whereNotIn('status', ['paid', 'void']))
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

    public function updateRemark(Request $request, Invoice $invoice, CustomerBalanceService $customerBalanceService)
    {
        $validated = $request->validate([
            'due_date' => ['nullable', 'date'],
            'remark' => ['nullable', 'string', 'max:2000'],
            'sale_type' => ['nullable', 'string', 'in:cash,credit'],
            'cash_back_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $updatedInvoice = DB::transaction(function () use ($customerBalanceService, $invoice, $validated) {
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
                if ($invoice->status === 'void') {
                    throw ValidationException::withMessages([
                        'cash_back_amount' => 'Void invoices cannot receive cash back adjustments.',
                    ]);
                }

                $cashBackAmount = round((float) ($validated['cash_back_amount'] ?? 0), 2);
                $cashBackLimit = round((float) $invoice->total_amount + (float) ($invoice->cash_back_amount ?? 0), 2);

                if ($cashBackAmount > $cashBackLimit) {
                    throw ValidationException::withMessages([
                        'cash_back_amount' => 'Cash back amount cannot exceed the invoice total amount.',
                    ]);
                }

                $totalAmount = round($cashBackLimit - $cashBackAmount, 2);
                $paidAmount = (float) $invoice->paid_amount;

                $invoiceUpdates['cash_back_amount'] = $cashBackAmount;
                $invoiceUpdates['total_amount'] = $totalAmount;
                $invoiceUpdates['balance_amount'] = max(0, $totalAmount - $paidAmount);
                $invoiceUpdates['status'] = $paidAmount >= $totalAmount ? 'paid' : ($paidAmount > 0 ? 'partial' : 'issued');
            }

            if ($invoiceUpdates !== []) {
                $invoice->update($invoiceUpdates);
            }

            if (array_key_exists('due_date', $invoiceUpdates) && $invoice->sales_order_id) {
                $invoice->salesOrder()->update(['payment_due_date' => $invoiceUpdates['due_date']]);
            }

            if (array_key_exists('cash_back_amount', $invoiceUpdates)) {
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
            'allocations.payment',
        ]));
    }
}
