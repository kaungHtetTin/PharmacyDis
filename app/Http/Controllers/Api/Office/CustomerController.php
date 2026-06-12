<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        return Customer::query()
            ->with(['creditStatuses.company'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(function ($searchQuery) use ($request) {
                    $searchQuery->where('name', 'like', "%{$request->search}%")
                        ->orWhere('code', 'like', "%{$request->search}%")
                        ->orWhere('owner_name', 'like', "%{$request->search}%")
                        ->orWhere('phone', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreCustomerRequest $request)
    {
        $data = $this->payload($request);
        $data['code'] = ($data['code'] ?? '') ?: $this->makeCode($data['name']);

        $customer = Customer::create($data);

        return response()->json($customer->fresh(['creditStatuses.company']), 201);
    }

    public function update(StoreCustomerRequest $request, Customer $customer)
    {
        $data = $this->payload($request);
        $data['code'] = ($data['code'] ?? '') ?: $customer->code;

        $customer->update($data);

        return $customer->fresh(['creditStatuses.company']);
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->noContent();
    }

    private function payload(StoreCustomerRequest $request): array
    {
        $data = $request->validated();
        $data['status'] = $data['status'] ?? 'active';

        return $data;
    }

    private function makeCode(string $name): string
    {
        $base = Str::upper(Str::slug($name, ''));
        $base = $base !== '' ? Str::limit($base, 20, '') : 'PHARMACY';
        $code = $base;
        $suffix = 1;

        while (Customer::withTrashed()->where('code', $code)->exists()) {
            $code = "{$base}{$suffix}";
            $suffix++;
        }

        return $code;
    }
}
