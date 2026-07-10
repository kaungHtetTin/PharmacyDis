<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSalesRepresentativeOrderRequest;
use App\Http\Resources\SalesOrderResource;
use App\Models\SalesOrder;
use App\Services\SalesOrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SalesOrderController extends Controller
{
    public function index(Request $request)
    {
        $salesRepresentative = $request->user()->salesRepresentative;

        $orders = SalesOrder::query()
            ->with(['company', 'customer', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule', 'invoices'])
            ->where('sales_representative_id', $salesRepresentative?->id)
            ->when($request->filled('order_id'), fn ($query) => $query->whereKey($request->integer('order_id')))
            ->orderByDesc('order_date')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return SalesOrderResource::collection($orders);
    }

    public function store(StoreSalesRepresentativeOrderRequest $request, SalesOrderService $salesOrderService)
    {
        $order = $salesOrderService->createForSalesRepresentative($request->user(), $request->validated());

        return (new SalesOrderResource($order))->response()->setStatusCode(201);
    }

    public function update(StoreSalesRepresentativeOrderRequest $request, SalesOrder $salesOrder, SalesOrderService $salesOrderService)
    {
        $salesRepresentative = $request->user()->salesRepresentative;

        abort_if(! $salesRepresentative || (int) $salesOrder->sales_representative_id !== (int) $salesRepresentative->id, 403);

        if ($salesOrder->status !== 'submitted') {
            throw ValidationException::withMessages([
                'status' => 'Only pending submitted orders can be edited from the sales app.',
            ]);
        }

        $data = $request->validated();
        $data['company_id'] = $salesRepresentative->company_id;
        $data['sales_representative_id'] = $salesRepresentative->id;

        $order = $salesOrderService->updateBeforeDelivery($salesOrder, $data, $request->user());

        return new SalesOrderResource($order);
    }

    public function destroy(Request $request, SalesOrder $salesOrder, SalesOrderService $salesOrderService)
    {
        $salesRepresentative = $request->user()->salesRepresentative;

        abort_if(! $salesRepresentative || (int) $salesOrder->sales_representative_id !== (int) $salesRepresentative->id, 403);

        if ($salesOrder->status !== 'submitted') {
            throw ValidationException::withMessages([
                'status' => 'Only pending submitted orders can be deleted from the sales app.',
            ]);
        }

        $salesOrderService->deleteBeforeDelivery($salesOrder, $request->user());

        return response()->noContent();
    }
}
