<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalesOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'order_no' => $this->order_no,
            'company_id' => $this->company_id,
            'company' => $this->whenLoaded('company'),
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer'),
            'sales_representative_id' => $this->sales_representative_id,
            'sales_representative' => $this->whenLoaded('salesRepresentative'),
            'order_date' => optional($this->order_date)->toDateString(),
            'requested_delivery_date' => optional($this->requested_delivery_date)->toDateString(),
            'status' => $this->status,
            'subtotal_amount' => $this->subtotal_amount,
            'discount_amount' => $this->discount_amount,
            'foc_value_amount' => $this->foc_value_amount,
            'total_amount' => $this->total_amount,
            'items' => SalesOrderItemResource::collection($this->whenLoaded('items')),
            'foc_items' => $this->whenLoaded('focItems'),
        ];
    }
}
