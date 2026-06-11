<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockReceiptItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'manufactured_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function receipt()
    {
        return $this->belongsTo(StockReceipt::class, 'stock_receipt_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }
}
