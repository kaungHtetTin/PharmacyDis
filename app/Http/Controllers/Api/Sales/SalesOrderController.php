<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSalesRepresentativeOrderRequest;
use App\Http\Resources\SalesOrderResource;
use App\Models\SalesOrder;
use App\Services\SalesOrderService;
use Illuminate\Http\Request;

class SalesOrderController extends Controller
{
    public function index(Request $request)
    {
        $salesRepresentative = $request->user()->salesRepresentative;

        $orders = SalesOrder::query()
            ->with(['company', 'customer', 'items.product', 'items.unit'])
            ->where('sales_representative_id', $salesRepresentative?->id)
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return SalesOrderResource::collection($orders);
    }

    public function store(StoreSalesRepresentativeOrderRequest $request, SalesOrderService $salesOrderService)
    {
        $order = $salesOrderService->createForSalesRepresentative($request->user(), $request->validated());

        return (new SalesOrderResource($order))->response()->setStatusCode(201);
    }
}
