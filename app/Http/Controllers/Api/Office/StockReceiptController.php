<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockReceiptRequest;
use App\Models\CompanyPayable;
use App\Models\StockReceipt;
use App\Models\StockReceiptItem;
use App\Services\StockReceivingService;
use Illuminate\Http\Request;

class StockReceiptController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);
        $summary = $this->summaryFor(clone $query);
        $paginator = $query
            ->with(['company', 'warehouse', 'items.product.baseUnit', 'items.unit', 'items.focUnit', 'payable'])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json(array_merge($paginator->toArray(), [
            'summary' => $summary,
        ]));
    }

    public function store(StoreStockReceiptRequest $request, StockReceivingService $stockReceivingService)
    {
        return response()->json($stockReceivingService->postReceipt($request->validated(), $request->user()), 201);
    }

    public function show(StockReceipt $stockReceipt)
    {
        return $stockReceipt->load(['company', 'warehouse', 'items.product.baseUnit', 'items.unit', 'items.focUnit', 'payable']);
    }

    public function update(StoreStockReceiptRequest $request, StockReceipt $stockReceipt, StockReceivingService $stockReceivingService)
    {
        return $stockReceivingService->replaceReceipt($stockReceipt, $request->validated(), $request->user());
    }

    public function destroy(StockReceipt $stockReceipt, StockReceivingService $stockReceivingService)
    {
        $stockReceivingService->deleteReceipt($stockReceipt);

        return response()->noContent();
    }

    private function filteredQuery(Request $request)
    {
        return StockReceipt::query()
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery->where('receipt_no', 'like', "%{$search}%")
                        ->orWhere('supplier_invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->warehouse_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->boolean('action_only'), fn ($query) => $query->whereHas('payable', fn ($payableQuery) => $payableQuery
                ->where('balance_amount', '>', 0)
                ->where('status', '!=', 'paid')))
            ->when($request->filled('payment_status'), function ($query) use ($request) {
                if ($request->payment_status === 'overdue') {
                    $query->whereHas('payable', function ($payableQuery) {
                        $payableQuery->where('status', '!=', 'paid')
                            ->whereDate('due_date', '<', now()->toDateString());
                    });
                    return;
                }

                $query->where(function ($query) use ($request) {
                    $query->where('payment_status', $request->payment_status)
                        ->orWhereHas('payable', fn ($payableQuery) => $payableQuery->where('status', $request->payment_status));
                });
            })
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('received_date', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('received_date', '<=', $request->date_to));
    }

    private function summaryFor($query): array
    {
        $receiptIds = (clone $query)->pluck('id');

        return [
            'receipt_count' => (clone $query)->count(),
            'total_amount' => (clone $query)->sum('total_amount'),
            'paid_amount' => CompanyPayable::whereIn('stock_receipt_id', $receiptIds)->sum('paid_amount'),
            'due_amount' => CompanyPayable::whereIn('stock_receipt_id', $receiptIds)->sum('balance_amount'),
            'item_count' => StockReceiptItem::whereIn('stock_receipt_id', $receiptIds)->count(),
            'base_quantity' => StockReceiptItem::whereIn('stock_receipt_id', $receiptIds)->sum('base_unit_quantity'),
        ];
    }
}
