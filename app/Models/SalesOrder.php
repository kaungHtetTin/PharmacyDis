<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'order_date' => 'date',
        'requested_delivery_date' => 'date',
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

    public function salesRepresentative()
    {
        return $this->belongsTo(SalesRepresentative::class);
    }

    public function items()
    {
        return $this->hasMany(SalesOrderItem::class);
    }

    public function focItems()
    {
        return $this->hasMany(SalesOrderFocItem::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}
