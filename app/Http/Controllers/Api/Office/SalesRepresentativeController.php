<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSalesRepresentativeRequest;
use App\Models\Role;
use App\Models\SalesRepresentative;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SalesRepresentativeController extends Controller
{
    public function index(Request $request)
    {
        return SalesRepresentative::query()
            ->with(['company', 'user:id,name,email,phone,status'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($nested) use ($search) {
                    $nested->where('phone', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->orderBy('employee_code')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreSalesRepresentativeRequest $request)
    {
        $data = $request->validated();
        $data['employee_code'] = $data['employee_code'] ?: $this->makeEmployeeCode();
        $data['status'] = $data['status'] ?? 'active';

        $salesRepresentative = DB::transaction(function () use ($data) {
            $user = User::create([
                'role_id' => $this->salesRoleId(),
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'user_type' => 'sales',
                'status' => $data['status'],
                'password' => Hash::make($data['password'] ?? 'password'),
            ]);

            return SalesRepresentative::create([
                'user_id' => $user->id,
                'company_id' => $data['company_id'],
                'employee_code' => $data['employee_code'],
                'phone' => $data['phone'] ?? null,
                'region' => $data['region'] ?? null,
                'joined_at' => $data['joined_at'] ?? null,
                'status' => $data['status'],
            ]);
        });

        return response()->json($salesRepresentative->load(['company', 'user:id,name,email,phone,status']), 201);
    }

    public function update(StoreSalesRepresentativeRequest $request, SalesRepresentative $salesRepresentative)
    {
        $data = $request->validated();
        $data['employee_code'] = $data['employee_code'] ?: $salesRepresentative->employee_code;
        $data['status'] = $data['status'] ?? $salesRepresentative->status;

        DB::transaction(function () use ($data, $salesRepresentative) {
            $userData = [
                'role_id' => $this->salesRoleId(),
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'user_type' => 'sales',
                'status' => $data['status'],
            ];

            if (!empty($data['password'])) {
                $userData['password'] = Hash::make($data['password']);
            }

            $salesRepresentative->user()->update($userData);
            $salesRepresentative->update([
                'company_id' => $data['company_id'],
                'employee_code' => $data['employee_code'],
                'phone' => $data['phone'] ?? null,
                'region' => $data['region'] ?? null,
                'joined_at' => $data['joined_at'] ?? null,
                'status' => $data['status'],
            ]);
        });

        return $salesRepresentative->fresh()->load(['company', 'user:id,name,email,phone,status']);
    }

    public function destroy(SalesRepresentative $salesRepresentative)
    {
        DB::transaction(function () use ($salesRepresentative) {
            $salesRepresentative->delete();
            $salesRepresentative->user?->update(['status' => 'inactive']);
        });

        return response()->noContent();
    }

    private function makeEmployeeCode(): string
    {
        $base = 'SR-' . now()->format('ymd');
        $code = $base . '-001';
        $suffix = 1;

        while (SalesRepresentative::withTrashed()->where('employee_code', $code)->exists()) {
            $suffix++;
            $code = $base . '-' . str_pad((string) $suffix, 3, '0', STR_PAD_LEFT);
        }

        return $code;
    }

    private function salesRoleId(): ?int
    {
        return Role::where('name', 'sales_representative')->value('id');
    }
}
