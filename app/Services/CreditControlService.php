<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerCompanyCreditStatus;
use Illuminate\Validation\ValidationException;

class CreditControlService
{
    public function statusFor(Customer $customer, Company $company): CustomerCompanyCreditStatus
    {
        return CustomerCompanyCreditStatus::firstOrCreate(
            ['customer_id' => $customer->id, 'company_id' => $company->id],
            ['credit_status' => 'active']
        );
    }

    public function assertOrderAllowed(Customer $customer, Company $company): void
    {
        $creditStatus = $this->statusFor($customer, $company);

        if ($creditStatus->credit_status === 'blocked') {
            throw ValidationException::withMessages([
                'customer_id' => 'Order creation is blocked for this pharmacy and company.',
            ]);
        }
    }

    public function refreshOutstanding(Customer $customer, Company $company, float $outstandingBalance): CustomerCompanyCreditStatus
    {
        $creditStatus = $this->statusFor($customer, $company);
        $creditStatus->outstanding_balance = $outstandingBalance;
        $creditStatus->credit_status = $creditStatus->credit_status === 'blocked'
            ? 'blocked'
            : ($outstandingBalance > $creditStatus->credit_limit && $creditStatus->credit_limit > 0 ? 'warning' : 'active');
        $creditStatus->save();

        return $creditStatus;
    }
}
