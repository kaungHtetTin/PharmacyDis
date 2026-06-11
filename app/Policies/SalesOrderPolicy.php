<?php

namespace App\Policies;

use App\Models\SalesOrder;
use App\Models\User;

class SalesOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->user_type, ['office', 'sales'], true);
    }

    public function view(User $user, SalesOrder $salesOrder): bool
    {
        if ($user->user_type === 'office') {
            return true;
        }

        return $user->salesRepresentative?->id === $salesOrder->sales_representative_id;
    }

    public function create(User $user): bool
    {
        return in_array($user->user_type, ['office', 'sales'], true);
    }

    public function approve(User $user): bool
    {
        return $user->user_type === 'office';
    }

    public function reject(User $user): bool
    {
        return $user->user_type === 'office';
    }
}
