<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'The provided credentials are incorrect.',
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => 'This account is not active.',
            ]);
        }

        if (isset($credentials['user_type']) && $user->user_type !== $credentials['user_type']) {
            throw ValidationException::withMessages([
                'email' => 'This account cannot access the selected app.',
            ]);
        }

        $tokenName = $user->user_type === 'sales' ? 'sales-app' : 'office-app';
        $token = $user->createToken($tokenName)->plainTextToken;
        $user->forceFill(['last_login_at' => now()])->save();

        return [
            'token' => $token,
            'user' => $user->load('role', 'salesRepresentative.company'),
        ];
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->noContent();
    }
}
