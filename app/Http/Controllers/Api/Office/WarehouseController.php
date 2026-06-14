<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWarehouseRequest;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        return Warehouse::query()
            ->withCount(['stockBatches', 'stockReceipts'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(function ($searchQuery) use ($request) {
                    $searchQuery->where('name', 'like', "%{$request->search}%")
                        ->orWhere('code', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreWarehouseRequest $request)
    {
        $data = $request->validated();
        $data['code'] = $data['code'] ?: $this->makeCode($data['name']);
        $data['status'] = $data['status'] ?? 'active';

        $warehouse = Warehouse::create($data);

        return response()->json($warehouse->loadCount(['stockBatches', 'stockReceipts']), 201);
    }

    public function update(StoreWarehouseRequest $request, Warehouse $warehouse)
    {
        $data = $request->validated();
        $data['code'] = $data['code'] ?: $warehouse->code;
        $data['status'] = $data['status'] ?? $warehouse->status;

        $warehouse->update($data);

        return $warehouse->fresh()->loadCount(['stockBatches', 'stockReceipts']);
    }

    public function destroy(Warehouse $warehouse)
    {
        if ($warehouse->stockBatches()->exists() || $warehouse->stockReceipts()->exists()) {
            throw ValidationException::withMessages([
                'warehouse' => 'This warehouse has stock history and cannot be deleted.',
            ]);
        }

        $warehouse->delete();

        return response()->noContent();
    }

    private function makeCode(string $name): string
    {
        $base = Str::upper(Str::slug($name, ''));
        $base = $base !== '' ? Str::limit($base, 20, '') : 'WAREHOUSE';
        $code = $base;
        $suffix = 1;

        while (Warehouse::withTrashed()->where('code', $code)->exists()) {
            $code = "{$base}{$suffix}";
            $suffix++;
        }

        return $code;
    }
}
