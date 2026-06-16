<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockTransferRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'company_id' => ['required', 'exists:companies,id'],
            'source_warehouse_id' => ['required', 'exists:warehouses,id', 'different:destination_warehouse_id'],
            'destination_warehouse_id' => ['required', 'exists:warehouses,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.stock_batch_id' => ['required', 'integer', 'exists:stock_batches,id'],
            'items.*.base_unit_quantity' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string'],
        ];
    }
}
