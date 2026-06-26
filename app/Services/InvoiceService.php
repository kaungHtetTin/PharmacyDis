<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceService
{
    public function __construct(
        private NumberGeneratorService $numberGeneratorService,
        private CustomerBalanceService $customerBalanceService,
    ) {
    }

    public function generateFromOrder(SalesOrder $order, ?User $actor = null, bool $allowSubmitted = false, ?float $taxAmount = null): Invoice
    {
        return DB::transaction(function () use ($order, $actor, $allowSubmitted, $taxAmount) {
            $order->load('items');

            $allowedStatuses = $allowSubmitted
                ? ['submitted', 'approved', 'invoiced', 'delivered']
                : ['approved', 'invoiced', 'delivered'];

            if (! in_array($order->status, $allowedStatuses, true)) {
                throw ValidationException::withMessages([
                    'order' => $allowSubmitted
                        ? 'Only submitted or approved orders can generate invoices.'
                        : 'Only approved orders can generate invoices.',
                ]);
            }

            $existingInvoice = $order->invoices()->with('items')->latest('id')->first();

            if ($existingInvoice) {
                if (! in_array($order->status, ['submitted', 'invoiced', 'delivered'], true)) {
                    $order->update(['status' => 'invoiced']);
                }

                $this->customerBalanceService->refresh((int) $existingInvoice->customer_id, (int) $existingInvoice->company_id);

                return $existingInvoice->fresh([
                    'items.product',
                    'items.unit',
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
                    'allocations.payment',
                ]);
            }

            $taxAmount = round(max(0, (float) ($taxAmount ?? $order->tax_amount ?? 0)), 2);
            $invoiceTotal = round((float) $order->total_amount, 2);

            $invoice = Invoice::create([
                'invoice_no' => $this->numberGeneratorService->next(Invoice::class, 'invoice_no', 'INV'),
                'sales_order_id' => $order->id,
                'company_id' => $order->company_id,
                'customer_id' => $order->customer_id,
                'sales_representative_id' => $order->sales_representative_id,
                'invoice_date' => now()->toDateString(),
                'due_date' => $order->payment_due_date?->toDateString() ?? now()->addDays((int) config('billing.invoice_due_days', 30))->toDateString(),
                'sale_type' => 'cash',
                'status' => 'issued',
                'subtotal_amount' => $order->subtotal_amount,
                'discount_amount' => $order->discount_amount,
                'tax_amount' => $taxAmount,
                'foc_value_amount' => $order->foc_value_amount,
                'total_amount' => $invoiceTotal,
                'balance_amount' => $invoiceTotal,
                'created_by' => $actor?->id,
            ]);

            foreach ($order->items as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'sales_order_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'unit_id' => $item->unit_id,
                    'quantity' => $item->quantity,
                    'conversion_factor_to_base' => $item->conversion_factor_to_base,
                    'base_unit_quantity' => $item->base_unit_quantity,
                    'unit_price' => $item->unit_price,
                    'discount_percentage' => $item->discount_percentage,
                    'discount_amount' => $item->discount_amount,
                    'foc_base_unit_quantity' => $item->foc_base_unit_quantity,
                    'line_total' => $item->line_total,
                ]);
            }

            if (! in_array($order->status, ['submitted', 'delivered'], true)) {
                $order->update(['status' => 'invoiced']);
            }
            $this->customerBalanceService->refresh((int) $invoice->customer_id, (int) $invoice->company_id);

            return $invoice->fresh([
                'items.product',
                'items.unit',
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
                'allocations.payment',
            ]);
        });
    }
}
