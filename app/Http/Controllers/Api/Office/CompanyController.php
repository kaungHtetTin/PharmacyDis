<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCompanyRequest;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        return Company::query()
            ->withCount('products')
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

    public function store(StoreCompanyRequest $request)
    {
        $data = $request->validated();
        $data['code'] = $data['code'] ?: $this->makeCode($data['name']);
        $data['status'] = $data['status'] ?? 'active';

        $company = Company::create($data);

        return response()->json($company->loadCount('products'), 201);
    }

    public function update(StoreCompanyRequest $request, Company $company)
    {
        $data = $request->validated();
        $data['code'] = $data['code'] ?: $company->code;
        $data['status'] = $data['status'] ?? $company->status;

        $company->update($data);

        return $company->fresh()->loadCount('products');
    }

    public function destroy(Company $company)
    {
        $company->delete();

        return response()->noContent();
    }

    private function makeCode(string $name): string
    {
        $base = Str::upper(Str::slug($name, ''));
        $base = $base !== '' ? Str::limit($base, 20, '') : 'COMPANY';
        $code = $base;
        $suffix = 1;

        while (Company::withTrashed()->where('code', $code)->exists()) {
            $code = "{$base}{$suffix}";
            $suffix++;
        }

        return $code;
    }
}
