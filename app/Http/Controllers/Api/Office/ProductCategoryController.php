<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductCategoryRequest;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductCategoryController extends Controller
{
    public function index(Request $request)
    {
        return ProductCategory::query()
            ->with('parent')
            ->withCount('products')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where('name', 'like', "%{$request->search}%")
                    ->orWhere('code', 'like', "%{$request->search}%");
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreProductCategoryRequest $request)
    {
        $data = $this->payload($request);
        $data['code'] = ($data['code'] ?? '') ?: $this->makeCode($data['name']);

        $category = ProductCategory::create($data);

        return response()->json($category->fresh(['parent'])->loadCount('products'), 201);
    }

    public function update(StoreProductCategoryRequest $request, ProductCategory $productCategory)
    {
        $data = $this->payload($request, $productCategory);
        $data['code'] = ($data['code'] ?? '') ?: $productCategory->code;

        $productCategory->update($data);

        return $productCategory->fresh(['parent'])->loadCount('products');
    }

    public function destroy(ProductCategory $productCategory)
    {
        $productCategory->delete();

        return response()->noContent();
    }

    private function payload(StoreProductCategoryRequest $request, ?ProductCategory $category = null): array
    {
        $data = $request->validated();
        $data['parent_id'] = ($data['parent_id'] ?? '') === '' ? null : $data['parent_id'];
        $data['status'] = $data['status'] ?? 'active';

        if ($category && $data['parent_id'] && (int) $data['parent_id'] === (int) $category->id) {
            throw ValidationException::withMessages([
                'parent_id' => 'A category cannot be its own parent.',
            ]);
        }

        return $data;
    }

    private function makeCode(string $name): string
    {
        $base = Str::upper(Str::slug($name, ''));
        $base = $base !== '' ? Str::limit($base, 20, '') : 'CATEGORY';
        $code = $base;
        $suffix = 1;

        while (ProductCategory::withTrashed()->where('code', $code)->exists()) {
            $code = "{$base}{$suffix}";
            $suffix++;
        }

        return $code;
    }
}
