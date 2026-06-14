<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockAdjustmentRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'company_id' => ['required', 'exists:companies,id'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'product_id' => ['required', 'exists:products,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'adjustment_type' => ['required', 'in:increase,decrease,damage,expiry'],
            'quantity' => ['required', 'integer', 'min:1'],
            'batch_no' => ['nullable', 'string'],
            'expiry_date' => ['nullable', 'date'],
            'reason' => ['nullable', 'string'],
        ];
    }
}
