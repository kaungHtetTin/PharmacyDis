<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalesOrderItemResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product' => $this->whenLoaded('product'),
            'unit_id' => $this->unit_id,
            'unit' => $this->whenLoaded('unit'),
            'quantity' => $this->quantity,
            'conversion_factor_to_base' => $this->conversion_factor_to_base,
            'base_unit_quantity' => $this->base_unit_quantity,
            'unit_price' => $this->unit_price,
            'discount_percentage' => $this->discount_percentage,
            'discount_amount' => $this->discount_amount,
            'foc_base_unit_quantity' => $this->foc_base_unit_quantity,
            'line_total' => $this->line_total,
        ];
    }
}
