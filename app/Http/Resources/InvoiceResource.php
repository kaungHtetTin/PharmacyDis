<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'invoice_no' => $this->invoice_no,
            'sales_order_id' => $this->sales_order_id,
            'sales_order' => $this->whenLoaded('salesOrder'),
            'company_id' => $this->company_id,
            'company' => $this->whenLoaded('company'),
            'customer_id' => $this->customer_id,
            'customer' => $this->whenLoaded('customer'),
            'invoice_date' => optional($this->invoice_date)->toDateString(),
            'due_date' => optional($this->due_date)->toDateString(),
            'sale_type' => $this->sale_type ?? 'cash',
            'remark' => $this->remark,
            'status' => $this->status,
            'subtotal_amount' => $this->subtotal_amount,
            'discount_amount' => $this->discount_amount,
            'tax_amount' => $this->tax_amount,
            'cash_back_amount' => $this->cash_back_amount ?? 0,
            'cash_back_limit_amount' => round(max(0, (float) ($this->original_total_amount ?: $this->total_amount) - (float) $this->return_credit_amount), 2),
            'foc_value_amount' => $this->foc_value_amount,
            'total_amount' => $this->total_amount,
            'original_total_amount' => $this->original_total_amount ?: $this->total_amount,
            'return_credit_amount' => $this->return_credit_amount ?? 0,
            'net_collectible_amount' => $this->net_collectible_amount ?? $this->total_amount,
            'paid_amount' => $this->paid_amount,
            'balance_amount' => $this->balance_amount,
            'settlement_status' => $this->settlement_status ?? $this->status,
            'items' => $this->whenLoaded('items'),
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($allocation) => [
                'id' => $allocation->id,
                'allocated_amount' => $allocation->allocated_amount,
                'payment' => $allocation->relationLoaded('payment') && $allocation->payment ? [
                    'id' => $allocation->payment->id,
                    'payment_no' => $allocation->payment->payment_no,
                    'payment_date' => optional($allocation->payment->payment_date)->toDateString(),
                    'amount' => $allocation->payment->amount,
                    'payment_method' => $allocation->payment->payment_method,
                    'reference_no' => $allocation->payment->reference_no,
                ] : null,
            ])),
            'sales_returns' => $this->whenLoaded('salesReturns'),
            'customer_credits' => $this->whenLoaded('customerCredits'),
            'customer_charge_adjustments' => $this->whenLoaded('customerChargeAdjustments'),
        ];
    }
}
