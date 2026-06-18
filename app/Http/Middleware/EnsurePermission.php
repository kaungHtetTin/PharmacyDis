<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions)
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if ($permissions === [] || collect($permissions)->contains(fn (string $permission) => $user->hasPermission($permission))) {
            return $next($request);
        }

        abort(403, 'You do not have permission to access this area.');
    }
}
