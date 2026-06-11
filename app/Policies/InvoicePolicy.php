<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->user_type === 'office';
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $user->user_type === 'office';
    }

    public function create(User $user): bool
    {
        return $user->user_type === 'office';
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return $user->user_type === 'office';
    }
}
