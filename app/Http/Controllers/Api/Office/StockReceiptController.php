<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockReceiptRequest;
use App\Models\StockReceipt;
use App\Services\StockReceivingService;
use Illuminate\Http\Request;

class StockReceiptController extends Controller
{
    public function index(Request $request)
    {
        return StockReceipt::query()
            ->with('items')
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreStockReceiptRequest $request, StockReceivingService $stockReceivingService)
    {
        return response()->json($stockReceivingService->postReceipt($request->validated(), $request->user()), 201);
    }
}
