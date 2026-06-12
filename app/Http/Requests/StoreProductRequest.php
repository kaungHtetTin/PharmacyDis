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

    protected function prepareForValidation(): void
    {
        if (is_string($this->product_units)) {
            $decodedProductUnits = json_decode($this->product_units, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                $this->merge(['product_units' => $decodedProductUnits]);
            }
        }
    }

    public function rules()
    {
        $productId = $this->route('product')?->id;

        return [
            'company_id' => ['required', 'exists:companies,id'],
            'product_category_id' => ['nullable', 'exists:product_categories,id'],
            'brand' => ['nullable', 'string', 'max:255'],
            'base_unit_id' => ['required', 'exists:units,id'],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($productId)],
            'barcode' => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->ignore($productId)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'primary_image_path' => ['nullable', 'string', 'max:255'],
            'primary_image' => ['nullable', 'image', 'max:4096'],
            'default_discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'commission_rate_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'low_stock_threshold_base_units' => ['nullable', 'integer', 'min:0'],
            'base_unit_selling_price' => ['nullable', 'numeric', 'min:0'],
            'product_units' => ['nullable', 'array'],
            'product_units.*.unit_id' => ['required_with:product_units', 'exists:units,id'],
            'product_units.*.conversion_factor_to_base' => ['required_with:product_units', 'integer', 'min:1'],
            'product_units.*.selling_price' => ['required_with:product_units', 'numeric', 'min:0'],
            'product_units.*.is_default_sales_unit' => ['nullable', 'boolean'],
            'product_units.*.status' => ['nullable', 'in:active,inactive'],
            'status' => ['nullable', 'in:active,inactive,discontinued'],
        ];
    }
}
