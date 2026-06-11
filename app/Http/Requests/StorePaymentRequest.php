<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'company_id' => ['required', 'exists:companies,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'payment_date' => ['nullable', 'date'],
            'amount' => ['required', 'numeric', 'min:1'],
            'payment_method' => ['nullable', 'in:cash,bank_transfer,cheque,mobile_money,other'],
            'reference_no' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'allocations' => ['nullable', 'array'],
            'allocations.*.invoice_id' => ['required', 'exists:invoices,id'],
            'allocations.*.allocated_amount' => ['required', 'numeric', 'min:1'],
        ];
    }
}
