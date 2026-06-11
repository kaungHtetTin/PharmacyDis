<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerBalance extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'last_calculated_at' => 'datetime',
    ];
}
