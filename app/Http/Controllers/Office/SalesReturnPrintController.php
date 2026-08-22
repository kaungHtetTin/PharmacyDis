<?php

namespace App\Http\Controllers\Office;

use App\Http\Controllers\Controller;
use App\Models\SalesReturn;

class SalesReturnPrintController extends Controller
{
    public function __invoke(SalesReturn $salesReturn)
    {
        $salesReturn->load([
            'company', 'customer', 'warehouse', 'invoice', 'salesOrder',
            'items.product', 'items.unit', 'focItems.product', 'focItems.approver',
            'focItems.chargeAdjustment', 'commissionAdjustments',
        ]);

        return view('office.sales-returns.print', ['salesReturn' => $salesReturn]);
    }
}
