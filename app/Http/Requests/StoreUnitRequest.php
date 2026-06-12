<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $unitId = $this->route('unit')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'abbreviation' => ['required', 'string', 'max:50', Rule::unique('units', 'abbreviation')->ignore($unitId)],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
