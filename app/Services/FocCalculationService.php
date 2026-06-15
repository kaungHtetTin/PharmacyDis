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

        $rules = FocRule::query()
            ->where('company_id', $company->id)
            ->where('product_id', $product->id)
            ->where('status', 'active')
            ->where(function ($query) use ($today) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', $today);
            })
            ->where(function ($query) use ($today) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', $today);
            })
            ->get();

        $basePrice = $product->productUnits()
            ->where('is_base_unit', true)
            ->value('selling_price') ?: 0;

        $quantityResult = $this->calculateTieredReward(
            $rules->where('rule_type', 'quantity')->all(),
            'minimum_quantity_base_units',
            $baseUnitQuantity,
            (float) $basePrice
        );
        $valueResult = $this->calculateTieredReward(
            $rules->where('rule_type', 'value')->all(),
            'minimum_order_value',
            $lineTotal,
            (float) $basePrice
        );
        $result = ($valueResult['reward_base_unit_quantity'] ?? 0) > ($quantityResult['reward_base_unit_quantity'] ?? 0)
            ? $valueResult
            : $quantityResult;

        if (($result['reward_base_unit_quantity'] ?? 0) <= 0) {
            return null;
        }

        return [
            'foc_rule_id' => $result['allocations'][0]['foc_rule_id'] ?? null,
            'product_id' => $product->id,
            'reward_base_unit_quantity' => $result['reward_base_unit_quantity'],
            'estimated_value_amount' => $result['estimated_value_amount'],
            'allocations' => $result['allocations'],
        ];
    }

    private function calculateTieredReward(array $rules, string $thresholdField, float $basis, float $basePrice): array
    {
        $remaining = $basis;
        $allocations = [];
        $rewardQuantity = 0;
        $estimatedValue = 0;

        usort($rules, fn (FocRule $first, FocRule $second) => (float) $second->{$thresholdField} <=> (float) $first->{$thresholdField});

        foreach ($rules as $rule) {
            $threshold = (float) $rule->{$thresholdField};

            if ($threshold <= 0 || $remaining < $threshold) {
                continue;
            }

            $multiplier = (int) floor($remaining / $threshold);
            $allocationReward = $multiplier * (int) $rule->reward_quantity_base_units;
            $allocationValue = $allocationReward * $basePrice;

            $allocations[] = [
                'foc_rule_id' => $rule->id,
                'reward_base_unit_quantity' => $allocationReward,
                'estimated_value_amount' => $allocationValue,
                'multiplier' => $multiplier,
            ];

            $rewardQuantity += $allocationReward;
            $estimatedValue += $allocationValue;
            $remaining -= $multiplier * $threshold;
        }

        return [
            'reward_base_unit_quantity' => $rewardQuantity,
            'estimated_value_amount' => $estimatedValue,
            'allocations' => $allocations,
        ];
    }
}
