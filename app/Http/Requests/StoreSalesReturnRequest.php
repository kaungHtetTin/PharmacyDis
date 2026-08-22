<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSalesReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['nullable', 'string', 'max:100'],
            'invoice_id' => ['required', 'integer', 'exists:invoices,id'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'return_date' => ['nullable', 'date'],
            'reason' => ['nullable', 'string'],
            'reason_code' => ['nullable', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.invoice_item_id' => ['required', 'integer', 'exists:invoice_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.condition' => ['required', Rule::in(['sellable', 'damaged', 'expired'])],
            'items.*.batch_no' => ['nullable', 'string', 'max:255'],
            'items.*.expiry_date' => ['nullable', 'date'],
            'items.*.reason' => ['nullable', 'string'],
            'foc_items' => ['nullable', 'array'],
            'foc_items.*.sales_order_foc_item_id' => ['required', 'integer', 'exists:sales_order_foc_items,id'],
            'foc_items.*.base_unit_quantity' => ['required', 'integer', 'min:1'],
            'foc_items.*.disposition' => ['required', Rule::in(['returned', 'charged', 'waived'])],
            'foc_items.*.reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
