<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerBalance;
use App\Models\Invoice;
use App\Models\Payment;

class CustomerBalanceService
{
    public function __construct(private CreditControlService $creditControlService)
    {
    }

    public function refresh(int $customerId, int $companyId): void
    {
        $invoiceTotal = Invoice::query()
            ->where('customer_id', $customerId)
            ->where('company_id', $companyId)
            ->where('status', '!=', 'void')
            ->sum('total_amount');
        $paymentTotal = Payment::query()
            ->where('customer_id', $customerId)
            ->where('company_id', $companyId)
            ->sum('amount');
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
