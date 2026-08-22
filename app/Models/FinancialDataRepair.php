<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialDataRepair extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'before_values' => 'array',
        'after_values' => 'array',
        'executed_at' => 'datetime',
    ];
}
