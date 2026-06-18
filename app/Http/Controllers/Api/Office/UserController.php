<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 1), 100);

        return User::query()
            ->with('role')
            ->where('user_type', 'office')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->string('search'));

                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('role_id'), fn ($query) => $query->where('role_id', $request->integer('role_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', (string) $request->string('status')))
            ->latest()
            ->paginate($perPage);
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $user = User::create([
            'role_id' => $data['role_id'],
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'user_type' => 'office',
            'status' => $data['status'] ?? 'active',
            'password' => Hash::make($data['password']),
        ]);

        return response()->json($user->load('role'), 201);
    }

    public function update(Request $request, User $user)
    {
        $this->ensureOfficeUser($user);

        $data = $request->validate($this->rules($user));

        if ($request->user()->is($user) && ($data['status'] ?? $user->status) !== 'active') {
            abort(422, 'You cannot deactivate your own account.');
        }

        $user->fill([
            'role_id' => $data['role_id'],
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return $user->load('role');
    }

    public function destroy(Request $request, User $user)
    {
        $this->ensureOfficeUser($user);

        if ($request->user()->is($user)) {
            abort(422, 'You cannot delete your own account.');
        }

        $user->delete();

        return response()->noContent();
    }

    public function roles()
    {
        return Role::query()
            ->where('name', '!=', 'sales_representative')
            ->orderBy('display_name')
            ->get(['id', 'name', 'display_name', 'description', 'permissions']);
    }

    private function rules(?User $user = null): array
    {
        $userId = $user?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'string', 'max:50'],
            'role_id' => [
                'required',
                Rule::exists('roles', 'id')->where(fn ($query) => $query->where('name', '!=', 'sales_representative')),
            ],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
        ];
    }

    private function ensureOfficeUser(User $user): void
    {
        if ($user->user_type !== 'office') {
            abort(404);
        }
    }
}
