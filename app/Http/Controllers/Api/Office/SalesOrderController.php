<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOfficeSalesOrderRequest;
use App\Http\Resources\SalesOrderResource;
use App\Models\SalesOrder;
use App\Services\SalesOrderService;
use Illuminate\Http\Request;

class SalesOrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = SalesOrder::query()
            ->with(['company', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user'])
            ->when($request->filled('order_id'), fn ($query) => $query->whereKey($request->integer('order_id')))
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->customer_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return SalesOrderResource::collection($orders);
    }

    public function store(StoreOfficeSalesOrderRequest $request, SalesOrderService $salesOrderService)
    {
        $data = $request->validated();
        $order = $request->boolean('auto_approve')
            ? $salesOrderService->createAndApprove($data, $request->user())
            : $salesOrderService->create($data, $request->user());

        return (new SalesOrderResource($order))->response()->setStatusCode(201);
    }

    public function approve(Request $request, SalesOrder $salesOrder, SalesOrderService $salesOrderService)
    {
        $salesOrder = $salesOrderService->approve($salesOrder, $request->user());

        return new SalesOrderResource($salesOrder);
    }

    public function reject(Request $request, SalesOrder $salesOrder)
    {
        $request->validate(['rejection_reason' => ['nullable', 'string']]);

        $salesOrder->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        return new SalesOrderResource($salesOrder->fresh(['company', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user']));
    }
}
