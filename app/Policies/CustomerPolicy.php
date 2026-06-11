<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->user_type, ['office', 'sales'], true);
    }

    public function view(User $user, Customer $customer): bool
    {
        if ($user->user_type === 'office') {
            return true;
        }

        return $user->salesRepresentative?->id === $customer->assigned_sales_representative_id;
    }

    public function create(User $user): bool
    {
        return $user->user_type === 'office';
    }

    public function update(User $user, Customer $customer): bool
    {
        return $user->user_type === 'office';
    }
}
