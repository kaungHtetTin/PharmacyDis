<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturnCommissionAdjustment extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'original_commission_amount' => 'decimal:2',
        'reversal_amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function salesReturn()
    {
        return $this->belongsTo(SalesReturn::class);
    }

    public function salesReturnItem()
    {
        return $this->belongsTo(SalesReturnItem::class);
    }

    public function salesOrderItem()
    {
        return $this->belongsTo(SalesOrderItem::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
