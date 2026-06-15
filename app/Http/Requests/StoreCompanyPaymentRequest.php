<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyPaymentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'company_id' => ['required', 'exists:companies,id'],
            'company_payable_id' => ['nullable', 'exists:company_payables,id'],
            'pay_all' => ['nullable', 'boolean'],
            'payment_date' => ['nullable', 'date'],
            'amount' => ['required_unless:pay_all,true', 'nullable', 'numeric', 'min:1'],
            'payment_method' => ['nullable', 'in:cash,bank_transfer,cheque,mobile_money,other'],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ];
    }
}
