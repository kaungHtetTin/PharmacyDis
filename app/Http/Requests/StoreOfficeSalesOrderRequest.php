<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOfficeSalesOrderRequest extends FormRequest
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
            'sales_representative_id' => ['nullable', 'exists:sales_representatives,id'],
            'warehouse_id' => [Rule::requiredIf($this->boolean('auto_approve')), 'nullable', 'integer', 'exists:warehouses,id'],
            'auto_approve' => ['nullable', 'boolean'],
            'order_date' => ['nullable', 'date'],
            'requested_delivery_date' => ['nullable', 'date'],
            'payment_due_date' => ['nullable', 'date'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.foc_unit_id' => ['nullable', 'exists:units,id'],
            'items.*.foc_quantity' => ['nullable', 'integer', 'min:0'],
            'items.*.discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
