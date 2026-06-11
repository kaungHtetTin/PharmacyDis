<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductUnit;
use Illuminate\Validation\ValidationException;

class ProductUnitConversionService
{
    public function resolve(Product $product, int $unitId): ProductUnit
    {
        $productUnit = $product->productUnits()
            ->where('unit_id', $unitId)
            ->where('status', 'active')
            ->first();

        if (! $productUnit) {
            throw ValidationException::withMessages([
                'unit_id' => 'The selected unit is not configured for this product.',
            ]);
        }

        return $productUnit;
    }

    public function toBaseQuantity(Product $product, int $unitId, int $quantity): int
    {
        return $quantity * $this->resolve($product, $unitId)->conversion_factor_to_base;
    }
}
