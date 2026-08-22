<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentAllocationService
{
    public function __construct(
        private NumberGeneratorService $numberGeneratorService,
        private CustomerBalanceService $customerBalanceService,
        private InvoiceSettlementService $invoiceSettlementService,
    ) {
    }

    public function recordCustomerPayment(array $data, ?User $actor = null): Payment
    {
        return DB::transaction(function () use ($data, $actor) {
            if (! empty($data['idempotency_key'])) {
                $existing = Payment::with('allocations.invoice')
                    ->where('idempotency_key', $data['idempotency_key'])
                    ->first();

                if ($existing) {
                    return $existing;
                }
            }

            $allocations = $data['allocations'] ?? [];
            $allocatedTotal = array_reduce($allocations, fn ($total, $allocation) => $total + (float) ($allocation['allocated_amount'] ?? 0), 0.0);

            if (count($allocations) === 0 || abs($allocatedTotal - (float) $data['amount']) > 0.01) {
                throw ValidationException::withMessages([
                    'allocations' => 'Payment amount must equal the selected invoice allocations.',
                ]);
            }

            $payment = Payment::create([
                'payment_no' => $this->numberGeneratorService->next(Payment::class, 'payment_no', 'PAY'),
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'company_id' => $data['company_id'],
                'customer_id' => $data['customer_id'],
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference_no' => $data['reference_no'] ?? null,
                'note' => $data['note'] ?? null,
                'created_by' => $actor?->id,
            ]);

            foreach ($allocations as $allocation) {
                $invoice = Invoice::lockForUpdate()->findOrFail($allocation['invoice_id']);
                $allocatedAmount = (float) $allocation['allocated_amount'];

                if ($invoice->status === 'void' || in_array($invoice->settlement_status, ['credited', 'void'], true)) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Payments cannot be allocated to a void or fully credited invoice.',
                    ]);
                }

                if ($allocatedAmount <= 0) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Allocated payment amounts must be greater than zero.',
                    ]);
                }

                if ((int) $invoice->company_id !== (int) $payment->company_id || (int) $invoice->customer_id !== (int) $payment->customer_id) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Selected invoice does not belong to this customer and company.',
                    ]);
                }

                if ($allocatedAmount > (float) $invoice->balance_amount) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Payment amount cannot exceed the selected invoice balance.',
                    ]);
                }

                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => $allocatedAmount,
                ]);

                $this->invoiceSettlementService->recalculate($invoice, $actor);
            }

            $this->customerBalanceService->refresh($payment->customer_id, $payment->company_id);

            return $payment->fresh('allocations.invoice');
        });
    }
}
