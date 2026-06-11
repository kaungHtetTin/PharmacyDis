<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerBalance;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PaymentAllocationService
{
    public function __construct(
        private NumberGeneratorService $numberGeneratorService,
        private CreditControlService $creditControlService,
    ) {
    }

    public function recordCustomerPayment(array $data, ?User $actor = null): Payment
    {
        return DB::transaction(function () use ($data, $actor) {
            $payment = Payment::create([
                'payment_no' => $this->numberGeneratorService->next(Payment::class, 'payment_no', 'PAY'),
                'company_id' => $data['company_id'],
                'customer_id' => $data['customer_id'],
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference_no' => $data['reference_no'] ?? null,
                'note' => $data['note'] ?? null,
                'created_by' => $actor?->id,
            ]);

            foreach ($data['allocations'] ?? [] as $allocation) {
                $invoice = Invoice::lockForUpdate()->findOrFail($allocation['invoice_id']);
                $allocatedAmount = (float) $allocation['allocated_amount'];

                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'allocated_amount' => $allocatedAmount,
                ]);

                $paidAmount = (float) $invoice->paid_amount + $allocatedAmount;
                $balanceAmount = max(0, (float) $invoice->total_amount - $paidAmount);
                $invoice->update([
                    'paid_amount' => $paidAmount,
                    'balance_amount' => $balanceAmount,
                    'status' => $balanceAmount <= 0 ? 'paid' : 'partial',
                ]);
            }

            $this->refreshCustomerBalance($payment->customer_id, $payment->company_id);

            return $payment->fresh('allocations.invoice');
        });
    }

    private function refreshCustomerBalance(int $customerId, int $companyId): void
    {
        $invoiceTotal = Invoice::where('customer_id', $customerId)->where('company_id', $companyId)->sum('total_amount');
        $paymentTotal = Payment::where('customer_id', $customerId)->where('company_id', $companyId)->sum('amount');
        $balance = $invoiceTotal - $paymentTotal;

        CustomerBalance::updateOrCreate(
            ['customer_id' => $customerId, 'company_id' => $companyId],
            [
                'invoice_total' => $invoiceTotal,
                'payment_total' => $paymentTotal,
                'balance_amount' => $balance,
                'last_calculated_at' => now(),
            ]
        );

        $customer = Customer::findOrFail($customerId);
        $company = Company::findOrFail($companyId);
        $this->creditControlService->refreshOutstanding($customer, $company, $balance);
    }
}
