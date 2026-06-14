<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockReceipt extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'received_date' => 'date',
        'payable_due_date' => 'date',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function items()
    {
        return $this->hasMany(StockReceiptItem::class);
    }

    public function payable()
    {
        return $this->hasOne(CompanyPayable::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
