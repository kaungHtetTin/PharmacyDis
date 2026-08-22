<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CustomerChargeAdjustment;
use App\Models\Customer;
use App\Models\CustomerBalance;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class CustomerBalanceService
{
    public function __construct(private CreditControlService $creditControlService)
    {
    }

    public function refresh(int $customerId, int $companyId): void
    {
        DB::transaction(function () use ($customerId, $companyId) {
            CustomerBalance::query()->firstOrCreate(
                ['customer_id' => $customerId, 'company_id' => $companyId],
                ['last_calculated_at' => now()]
            );
            $balanceRow = CustomerBalance::query()
                ->where('customer_id', $customerId)
                ->where('company_id', $companyId)
                ->lockForUpdate()
                ->firstOrFail();
            $invoiceTotal = Invoice::query()
                ->where('customer_id', $customerId)
                ->where('company_id', $companyId)
                ->where('status', '!=', 'void')
                ->sum(DB::raw('CASE WHEN original_total_amount > 0 THEN net_collectible_amount ELSE total_amount END'));
            $paymentTotal = Payment::query()
                ->where('customer_id', $customerId)
                ->where('company_id', $companyId)
                ->sum('amount');
            $chargeTotal = CustomerChargeAdjustment::query()
                ->where('customer_id', $customerId)
                ->where('company_id', $companyId)
                ->where('status', 'posted')
                ->sum('amount');
            $balance = $invoiceTotal + $chargeTotal - $paymentTotal;

            $balanceRow->update([
                'invoice_total' => $invoiceTotal + $chargeTotal,
                'payment_total' => $paymentTotal,
                'balance_amount' => $balance,
                'last_calculated_at' => now(),
            ]);

            $customer = Customer::withTrashed()->find($customerId);
            $company = Company::withTrashed()->find($companyId);

            // Historical invoices can legitimately reference archived master data.
            // The financial cache is still rebuilt, but no new credit-state row can
            // be evaluated when the referenced party was physically removed.
            if (! $customer || ! $company) {
                return;
            }

            $this->creditControlService->refreshOutstanding($customer, $company, max(0, $balance));
        });
    }
}
