<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

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
}
