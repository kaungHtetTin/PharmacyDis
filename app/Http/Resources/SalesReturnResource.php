<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SalesReturnResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'return_no' => $this->return_no,
            'invoice_id' => $this->invoice_id,
            'invoice' => $this->whenLoaded('invoice'),
            'sales_order_id' => $this->sales_order_id,
            'sales_order' => $this->whenLoaded('salesOrder'),
            'company_id' => $this->company_id,
            'company' => $this->whenLoaded('company'),
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer'),
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => $this->whenLoaded('warehouse'),
            'return_date' => optional($this->return_date)->toDateString(),
            'status' => $this->status,
            'total_amount' => $this->total_amount,
            'payment_amount' => $this->relationLoaded('invoice') && $this->invoice ? $this->invoice->paid_amount : 0,
            'invoice_balance_amount' => $this->relationLoaded('invoice') && $this->invoice ? $this->invoice->balance_amount : 0,
            'reason' => $this->reason,
            'items' => $this->whenLoaded('items'),
            'items_count' => $this->items_count ?? $this->whenCounted('items'),
        ];
    }
}
