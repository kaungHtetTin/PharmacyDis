<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesOrderFocItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function salesOrderItem()
    {
        return $this->belongsTo(SalesOrderItem::class);
    }

    public function focRule()
    {
        return $this->belongsTo(FocRule::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
