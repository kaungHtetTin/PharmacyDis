<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductCategoryRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $categoryId = $this->route('product_category')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', Rule::unique('product_categories', 'code')->ignore($categoryId)],
            'parent_id' => ['nullable', 'exists:product_categories,id'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
