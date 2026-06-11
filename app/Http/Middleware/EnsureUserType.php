<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureUserType
{
    public function handle(Request $request, Closure $next, string $userType)
    {
        if (! $request->user() || $request->user()->user_type !== $userType) {
            abort(403, 'This account cannot access this area.');
        }

        return $next($request);
    }
}
