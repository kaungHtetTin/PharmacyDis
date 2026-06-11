<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        return Product::query()
            ->with(['company', 'category', 'brand', 'baseUnit', 'productUnits.unit', 'focRules' => fn ($query) => $query->where('status', 'active')])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where('name', 'like', "%{$request->search}%")
                    ->orWhere('sku', 'like', "%{$request->search}%");
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreProductRequest $request)
    {
        $data = $this->payload($request);
        $data['sku'] = ($data['sku'] ?? '') ?: $this->makeSku($data['name']);

        $product = Product::create($data);
        $this->syncBaseUnit($product, (float) ($request->validated()['base_unit_selling_price'] ?? 0));

        return response()->json($product->fresh(['company', 'category', 'brand', 'baseUnit', 'productUnits.unit', 'focRules']), 201);
    }

    public function update(StoreProductRequest $request, Product $product)
    {
        $data = $this->payload($request);
        $data['sku'] = ($data['sku'] ?? '') ?: $product->sku;

        $product->update($data);
        $this->syncBaseUnit($product, (float) ($request->validated()['base_unit_selling_price'] ?? 0));

        return $product->fresh(['company', 'category', 'brand', 'baseUnit', 'productUnits.unit', 'focRules']);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->noContent();
    }

    private function payload(StoreProductRequest $request): array
    {
        $data = $request->validated();
        unset($data['base_unit_selling_price']);

        return array_merge($data, [
            'product_category_id' => $data['product_category_id'] ?? null,
            'brand_id' => $data['brand_id'] ?? null,
            'primary_image_path' => $data['primary_image_path'] ?? null,
            'default_discount_percentage' => $data['default_discount_percentage'] ?? 0,
            'commission_rate_percentage' => $data['commission_rate_percentage'] ?? 0,
            'low_stock_threshold_base_units' => $data['low_stock_threshold_base_units'] ?? 0,
            'status' => $data['status'] ?? 'active',
        ]);
    }

    private function syncBaseUnit(Product $product, float $sellingPrice): void
    {
        $product->productUnits()->update(['is_base_unit' => false]);
        $product->productUnits()->updateOrCreate(
            ['unit_id' => $product->base_unit_id],
            [
                'conversion_factor_to_base' => 1,
                'selling_price' => $sellingPrice,
                'is_base_unit' => true,
                'is_default_sales_unit' => true,
                'status' => 'active',
            ]
        );
    }

    private function makeSku(string $name): string
    {
        $base = Str::upper(Str::slug($name, ''));
        $base = $base !== '' ? Str::limit($base, 24, '') : 'PRODUCT';
        $sku = $base;
        $suffix = 1;

        while (Product::withTrashed()->where('sku', $sku)->exists()) {
            $sku = "{$base}{$suffix}";
            $suffix++;
        }

        return $sku;
    }
}
