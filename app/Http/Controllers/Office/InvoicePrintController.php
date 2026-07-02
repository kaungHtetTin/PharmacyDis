<?php

namespace App\Http\Controllers\Office;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Models\StockMovement;
use App\Support\InvoicePrintSettings;
use Illuminate\Http\Request;

class InvoicePrintController extends Controller
{
    public function __invoke(Request $request, Invoice $invoice)
    {
        $invoice->load([
            'company',
            'customer',
            'salesRepresentative.user',
            'salesOrder.salesRepresentative.user',
            'items.product',
            'items.unit',
            'items.salesOrderItem.focUnit',
            'allocations.payment',
        ]);

        return view('office.invoices.print', [
            'autoPrint' => $request->boolean('print'),
            'invoice' => $invoice,
            'invoiceSettings' => InvoicePrintSettings::values(),
            'itemBatchSummaries' => $this->itemBatchSummaries($invoice),
            'paper' => 'a5',
            'shareUrl' => route('public.invoices.show', $invoice),
        ]);
    }

    private function itemBatchSummaries(Invoice $invoice): array
    {
        if (! $invoice->sales_order_id) {
            return [];
        }

        $movementType = $invoice->salesOrder?->status === 'delivered' ? 'sale' : 'reserve';

        return StockMovement::query()
            ->with('stockBatch:id,batch_no,expiry_date')
            ->where('reference_type', SalesOrder::class)
            ->where('reference_id', $invoice->sales_order_id)
            ->where('movement_type', $movementType)
            ->whereIn('product_id', $invoice->items->pluck('product_id')->filter()->unique())
            ->get()
            ->groupBy('product_id')
            ->map(function ($movements) {
                $batches = $movements
                    ->map(fn ($movement) => $movement->stockBatch?->batch_no)
                    ->filter()
                    ->unique()
                    ->values();
                $expiries = $movements
                    ->map(fn ($movement) => $movement->stockBatch?->expiry_date?->format('M-y'))
                    ->filter()
                    ->unique()
                    ->values();

                return [
                    'batch' => $batches->isNotEmpty() ? $batches->join(', ') : '-',
                    'expiry' => $expiries->isNotEmpty() ? $expiries->join(', ') : '-',
                ];
            })
            ->all();
    }
}
