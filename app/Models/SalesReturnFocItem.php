<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturnFocItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'estimated_value_amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function salesReturn()
    {
        return $this->belongsTo(SalesReturn::class);
    }

    public function salesOrderFocItem()
    {
        return $this->belongsTo(SalesOrderFocItem::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function chargeAdjustment()
    {
        return $this->hasOne(CustomerChargeAdjustment::class);
    }
}
