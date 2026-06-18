<?php

namespace App\Http\Controllers\Office;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoicePrintController extends Controller
{
    public function __invoke(Request $request, Invoice $invoice)
    {
        $paper = $request->query('paper', 'a4');
        $allowedPaperSizes = ['a4', 'a5', 'inch-4', 'inch-3', 'inch-2'];

        if (! in_array($paper, $allowedPaperSizes, true)) {
            $paper = 'a4';
        }

        $invoice->load([
            'company',
            'customer',
            'salesOrder',
            'items.product',
            'items.unit',
            'allocations.payment',
        ]);

        return view('office.invoices.print', [
            'autoPrint' => $request->boolean('print'),
            'invoice' => $invoice,
            'paper' => $paper,
            'paperSizes' => [
                'a4' => ['label' => 'A4', 'detail' => '210 x 297 mm'],
                'a5' => ['label' => 'A5', 'detail' => '148 x 210 mm'],
                'inch-4' => ['label' => '4 inch', 'detail' => '4 in roll'],
                'inch-3' => ['label' => '3 inch', 'detail' => '3 in roll'],
                'inch-2' => ['label' => '2 inch', 'detail' => '2 in roll'],
            ],
        ]);
    }
}
