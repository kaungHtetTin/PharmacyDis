<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->user_type, ['office', 'sales'], true);
    }

    public function view(User $user, Product $product): bool
    {
        if ($user->user_type === 'office') {
            return true;
        }

        return $user->salesRepresentative?->company_id === $product->company_id;
    }

    public function create(User $user): bool
    {
        return $user->user_type === 'office';
    }

    public function update(User $user, Product $product): bool
    {
        return $user->user_type === 'office';
    }
}
