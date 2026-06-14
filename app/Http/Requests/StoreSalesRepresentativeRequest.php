<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSalesRepresentativeRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $salesRepresentative = $this->route('sales_representative');
        $salesRepresentativeId = $salesRepresentative?->id;
        $userId = $salesRepresentative?->user_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'string', 'max:50'],
            'company_id' => ['required', 'exists:companies,id'],
            'employee_code' => ['nullable', 'string', 'max:100', Rule::unique('sales_representatives', 'employee_code')->ignore($salesRepresentativeId)],
            'region' => ['nullable', 'string', 'max:255'],
            'joined_at' => ['nullable', 'date'],
            'password' => ['nullable', 'string', 'min:8'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
