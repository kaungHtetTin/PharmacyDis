<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFocRuleRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'company_id' => ['required', 'exists:companies,id'],
            'product_id' => ['required', 'exists:products,id'],
            'rule_type' => ['required', 'in:quantity,value'],
            'minimum_quantity_base_units' => ['nullable', 'integer', 'min:1', 'required_if:rule_type,quantity'],
            'minimum_order_value' => ['nullable', 'numeric', 'min:1', 'required_if:rule_type,value'],
            'reward_quantity_base_units' => ['required', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
