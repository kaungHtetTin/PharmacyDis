<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class FinanceTransactionResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'transaction_no' => $this->transaction_no,
            'direction' => $this->direction,
            'category' => $this->category,
            'transaction_date' => optional($this->transaction_date)->toDateString(),
            'amount' => $this->amount,
            'payment_method' => $this->payment_method,
            'reference_no' => $this->reference_no,
            'description' => $this->description,
            'source_type' => $this->source_type,
            'source_id' => $this->source_id,
            'status' => $this->status,
            'creator' => $this->whenLoaded('creator'),
        ];
    }
}
