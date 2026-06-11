<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    public function brands()
    {
        return $this->hasMany(Brand::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function salesRepresentatives()
    {
        return $this->hasMany(SalesRepresentative::class);
    }

    public function creditStatuses()
    {
        return $this->hasMany(CustomerCompanyCreditStatus::class);
    }
}
