<?php

namespace App\Http\Requests;

use App\Models\FinanceCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFinanceTransactionRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'direction' => ['required', 'in:income,outcome'],
            'category' => [
                'required',
                'string',
                'max:80',
                Rule::exists('finance_categories', 'code')->where('status', 'active'),
            ],
            'transaction_date' => ['nullable', 'date'],
            'amount' => ['required', 'numeric', 'min:1'],
            'payment_method' => ['nullable', 'in:cash,bank_transfer,cheque,mobile_money,other'],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'in:recorded,void'],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $category = FinanceCategory::where('code', $this->input('category'))->first();

            if (! $category || $category->direction === 'both' || $category->direction === $this->input('direction')) {
                return;
            }

            $validator->errors()->add('category', 'Selected category does not match the transaction type.');
        });
    }
}
