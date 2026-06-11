<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFocRuleRequest;
use App\Models\FocRule;
use Illuminate\Http\Request;

class FocRuleController extends Controller
{
    public function index(Request $request)
    {
        return FocRule::query()
            ->with(['company:id,name,code', 'product:id,name,sku'])
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('product_id'), fn ($query) => $query->where('product_id', $request->product_id))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreFocRuleRequest $request)
    {
        return FocRule::create($request->validated())->load(['company:id,name,code', 'product:id,name,sku']);
    }

    public function update(StoreFocRuleRequest $request, FocRule $foc_rule)
    {
        $foc_rule->update($request->validated());

        return $foc_rule->fresh(['company:id,name,code', 'product:id,name,sku']);
    }

    public function destroy(FocRule $foc_rule)
    {
        $foc_rule->delete();

        return response()->noContent();
    }
}
