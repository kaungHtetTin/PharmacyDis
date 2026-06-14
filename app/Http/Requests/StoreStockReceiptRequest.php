<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockReceiptRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'company_id' => ['required', 'exists:companies,id'],
            'warehouse_id' => ['nullable', 'exists:warehouses,id'],
            'received_date' => ['nullable', 'date'],
            'supplier_invoice_no' => ['nullable', 'string'],
            'payable_due_date' => ['nullable', 'date'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.foc_unit_id' => ['nullable', 'exists:units,id'],
            'items.*.foc_quantity' => ['nullable', 'integer', 'min:0'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'items.*.batch_no' => ['nullable', 'string'],
            'items.*.manufactured_date' => ['nullable', 'date'],
            'items.*.expiry_date' => ['nullable', 'date'],
        ];
    }
}
