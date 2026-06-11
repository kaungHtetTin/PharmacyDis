<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $productId = $this->route('product')?->id;

        return [
            'company_id' => ['required', 'exists:companies,id'],
            'product_category_id' => ['nullable', 'exists:product_categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'base_unit_id' => ['required', 'exists:units,id'],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($productId)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'primary_image_path' => ['nullable', 'string', 'max:255'],
            'default_discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'commission_rate_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'low_stock_threshold_base_units' => ['nullable', 'integer', 'min:0'],
            'base_unit_selling_price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:active,inactive,discontinued'],
        ];
    }
}
