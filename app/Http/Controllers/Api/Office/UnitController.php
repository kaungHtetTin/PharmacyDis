<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUnitRequest;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UnitController extends Controller
{
    public function index(Request $request)
    {
        return Unit::query()
            ->withCount('productUnits')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(function ($searchQuery) use ($request) {
                    $searchQuery->where('name', 'like', "%{$request->search}%")
                        ->orWhere('abbreviation', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreUnitRequest $request)
    {
        $data = $request->validated();
        $data['status'] = $data['status'] ?? 'active';

        $unit = Unit::create($data);

        return response()->json($unit->loadCount('productUnits'), 201);
    }

    public function update(StoreUnitRequest $request, Unit $unit)
    {
        $data = $request->validated();
        $data['status'] = $data['status'] ?? $unit->status;

        $unit->update($data);

        return $unit->fresh()->loadCount('productUnits');
    }

    public function destroy(Unit $unit)
    {
        if ($unit->productUnits()->exists()) {
            throw ValidationException::withMessages([
                'unit' => 'This unit is assigned to product pricing rows and cannot be deleted.',
            ]);
        }

        $unit->delete();

        return response()->noContent();
    }
}
