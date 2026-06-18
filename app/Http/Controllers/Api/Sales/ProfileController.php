<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();
        $salesRepresentative = $user->salesRepresentative;

        abort_if(! $salesRepresentative, 403, 'Sales representative profile is required.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'region' => ['nullable', 'string', 'max:255'],
            'profile_note' => ['nullable', 'string', 'max:1000'],
            'profile_image' => ['nullable', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('profile_image')) {
            if ($user->profile_image_path) {
                Storage::disk('public')->delete($user->profile_image_path);
            }

            $data['profile_image_path'] = $request->file('profile_image')->store('sales-profiles', 'public');
        }

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'profile_image_path' => $data['profile_image_path'] ?? $user->profile_image_path,
        ]);

        $salesRepresentative->update([
            'phone' => $data['phone'] ?? null,
            'region' => $data['region'] ?? null,
            'profile_note' => $data['profile_note'] ?? null,
        ]);

        return $user->fresh()->load('role', 'salesRepresentative.company');
    }
}
