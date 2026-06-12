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
            ->with(['company', 'category', 'baseUnit', 'productUnits.unit', 'focRules' => fn ($query) => $query->where('status', 'active')])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(function ($searchQuery) use ($request) {
                    $searchQuery->where('name', 'like', "%{$request->search}%")
                        ->orWhere('sku', 'like', "%{$request->search}%")
                        ->orWhere('barcode', 'like', "%{$request->search}%")
                        ->orWhere('brand', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreProductRequest $request)
    {
        $validated = $request->validated();
        $data = $this->payload($request);
        $data['sku'] = ($data['sku'] ?? '') ?: $this->makeSku($data['name']);

        $product = Product::create($data);
        $this->syncProductUnits($product, $validated['product_units'] ?? [], (float) ($validated['base_unit_selling_price'] ?? 0));

        return response()->json($product->fresh(['company', 'category', 'baseUnit', 'productUnits.unit', 'focRules']), 201);
    }

    public function update(StoreProductRequest $request, Product $product)
    {
        $validated = $request->validated();
        $data = $this->payload($request, $product);
        $data['sku'] = ($data['sku'] ?? '') ?: $product->sku;

        $product->update($data);
        $this->syncProductUnits($product, $validated['product_units'] ?? [], (float) ($validated['base_unit_selling_price'] ?? 0));

        return $product->fresh(['company', 'category', 'baseUnit', 'productUnits.unit', 'focRules']);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->noContent();
    }

    private function payload(StoreProductRequest $request, ?Product $product = null): array
    {
        $data = $request->validated();
        $hasIncomingImagePath = array_key_exists('primary_image_path', $data);
        unset($data['base_unit_selling_price'], $data['primary_image'], $data['product_units']);

        if ($request->hasFile('primary_image')) {
            $data['primary_image_path'] = $request->file('primary_image')->store('products', 'public');
            $hasIncomingImagePath = true;
        } elseif ($product && ! $hasIncomingImagePath) {
            unset($data['primary_image_path']);
        }

        $defaults = [
            'product_category_id' => $data['product_category_id'] ?? null,
            'brand' => $data['brand'] ?? null,
            'default_discount_percentage' => $data['default_discount_percentage'] ?? 0,
            'commission_rate_percentage' => $data['commission_rate_percentage'] ?? 0,
            'low_stock_threshold_base_units' => $data['low_stock_threshold_base_units'] ?? 0,
            'status' => $data['status'] ?? 'active',
        ];

        if (! $product || $hasIncomingImagePath) {
            $defaults['primary_image_path'] = $data['primary_image_path'] ?? null;
        }

        return array_merge($data, $defaults);
    }

    private function syncProductUnits(Product $product, array $submittedUnits, float $baseUnitSellingPrice): void
    {
        $unitsById = [];

        foreach ($submittedUnits as $unit) {
            if (empty($unit['unit_id'])) {
                continue;
            }

            $unitId = (int) $unit['unit_id'];
            $unitsById[$unitId] = [
                'unit_id' => $unitId,
                'conversion_factor_to_base' => max(1, (int) ($unit['conversion_factor_to_base'] ?? 1)),
                'selling_price' => (float) ($unit['selling_price'] ?? 0),
                'is_default_sales_unit' => filter_var($unit['is_default_sales_unit'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'status' => $unit['status'] ?? 'active',
            ];
        }

        if (! isset($unitsById[$product->base_unit_id])) {
            $unitsById[$product->base_unit_id] = [
                'unit_id' => $product->base_unit_id,
                'conversion_factor_to_base' => 1,
                'selling_price' => $baseUnitSellingPrice,
                'is_default_sales_unit' => true,
                'status' => 'active',
            ];
        }

        $unitsById[$product->base_unit_id]['conversion_factor_to_base'] = 1;
        $unitsById[$product->base_unit_id]['status'] = 'active';

        $defaultUnitId = collect($unitsById)
            ->first(fn ($unit) => $unit['status'] === 'active' && $unit['is_default_sales_unit'])['unit_id'] ?? null;

        if (! $defaultUnitId) {
            $defaultUnitId = $product->base_unit_id;
        }

        $activeUnitIds = array_keys($unitsById);

        $product->productUnits()
            ->whereNotIn('unit_id', $activeUnitIds)
            ->update([
                'is_base_unit' => false,
                'is_default_sales_unit' => false,
                'status' => 'inactive',
            ]);

        foreach ($unitsById as $unitId => $unit) {
            $product->productUnits()->updateOrCreate(
                ['unit_id' => $unitId],
                [
                    'conversion_factor_to_base' => $unitId === $product->base_unit_id ? 1 : $unit['conversion_factor_to_base'],
                    'selling_price' => $unit['selling_price'],
                    'is_base_unit' => $unitId === $product->base_unit_id,
                    'is_default_sales_unit' => $unit['status'] === 'active' && $unitId === $defaultUnitId,
                    'status' => $unit['status'],
                ]
            );
        }
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
