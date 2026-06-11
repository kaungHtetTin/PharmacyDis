<?php

namespace App\Services;

use App\Models\Company;
use App\Models\FocRule;
use App\Models\Product;

class FocCalculationService
{
    public function calculate(Company $company, Product $product, int $baseUnitQuantity, float $lineTotal): ?array
    {
        $today = now()->toDateString();

        $rule = FocRule::query()
            ->where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('status', 'active')
            ->where(function ($query) use ($today) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', $today);
            })
            ->where(function ($query) use ($today) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', $today);
            })
            ->where(function ($query) use ($baseUnitQuantity, $lineTotal) {
                $query->where(function ($quantityQuery) use ($baseUnitQuantity) {
                    $quantityQuery->where('rule_type', 'quantity')
                        ->where('minimum_quantity_base_units', '<=', $baseUnitQuantity);
                })->orWhere(function ($valueQuery) use ($lineTotal) {
                    $valueQuery->where('rule_type', 'value')
                        ->where('minimum_order_value', '<=', $lineTotal);
                });
            })
            ->orderByDesc('reward_quantity_base_units')
            ->first();

        if (! $rule) {
            return null;
        }

        $basePrice = $product->productUnits()
            ->where('is_base_unit', true)
            ->value('selling_price') ?: 0;

        return [
            'foc_rule_id' => $rule->id,
            'product_id' => $product->id,
            'reward_base_unit_quantity' => $rule->reward_quantity_base_units,
            'estimated_value_amount' => $rule->reward_quantity_base_units * $basePrice,
        ];
    }
}
