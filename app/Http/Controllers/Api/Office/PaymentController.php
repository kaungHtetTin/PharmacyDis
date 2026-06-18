<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\PaymentAllocationService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $payments = Payment::query()
            ->with(['company', 'customer', 'allocations.invoice'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->customer_id))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return PaymentResource::collection($payments);
    }

    public function show(Payment $payment)
    {
        $payment->load(['company', 'customer', 'allocations.invoice']);

        return new PaymentResource($payment);
    }

    public function store(StorePaymentRequest $request, PaymentAllocationService $paymentAllocationService)
    {
        $payment = $paymentAllocationService->recordCustomerPayment($request->validated(), $request->user());

        return (new PaymentResource($payment))->response()->setStatusCode(201);
    }
}
