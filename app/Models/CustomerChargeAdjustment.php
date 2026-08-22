<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerChargeAdjustment extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'adjustment_date' => 'date',
        'amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function salesReturn()
    {
        return $this->belongsTo(SalesReturn::class);
    }

    public function salesReturnFocItem()
    {
        return $this->belongsTo(SalesReturnFocItem::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
