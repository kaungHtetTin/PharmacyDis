<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerCompanyCreditStatus extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'blocked_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function blockedInvoice()
    {
        return $this->belongsTo(Invoice::class, 'blocked_invoice_id');
    }
}
