<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFinanceCategoryRequest;
use App\Models\FinanceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FinanceCategoryController extends Controller
{
    public function index(Request $request)
    {
        return FinanceCategory::query()
            ->withCount('transactions')
            ->when($request->filled('direction'), function ($query) use ($request) {
                $query->where(function ($query) use ($request) {
                    $query->where('direction', $request->direction)
                        ->orWhere('direction', 'both');
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderBy('direction')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreFinanceCategoryRequest $request)
    {
        $data = $this->payload($request);
        $data['code'] = ($data['code'] ?? '') ?: $this->makeCode($data['name']);

        $category = FinanceCategory::create($data);

        return response()->json($category->loadCount('transactions'), 201);
    }

    public function update(StoreFinanceCategoryRequest $request, FinanceCategory $financeCategory)
    {
        $data = $this->payload($request);
        $data['code'] = ($data['code'] ?? '') ?: $financeCategory->code;

        $financeCategory->update($data);

        return $financeCategory->fresh()->loadCount('transactions');
    }

    public function destroy(FinanceCategory $financeCategory)
    {
        $financeCategory->delete();

        return response()->noContent();
    }

    private function payload(StoreFinanceCategoryRequest $request): array
    {
        $data = $request->validated();
        $code = $data['code'] ?? '';
        $data['code'] = $code ? Str::slug($code, '_') : '';
        $data['status'] = $data['status'] ?? 'active';

        return $data;
    }

    private function makeCode(string $name): string
    {
        $base = Str::slug($name, '_');
        $base = $base !== '' ? Str::limit($base, 80, '') : 'finance_category';
        $code = $base;
        $suffix = 1;

        while (FinanceCategory::withTrashed()->where('code', $code)->exists()) {
            $code = "{$base}_{$suffix}";
            $suffix++;
        }

        return $code;
    }
}
