<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        return AuditLog::query()
            ->with('user:id,name,email,user_type')
            ->when($request->filled('action'), fn ($query) => $query->where('action', $request->action))
            ->when($request->filled('user_id'), fn ($query) => $query->where('user_id', $request->integer('user_id')))
            ->when($request->filled('auditable_type'), fn ($query) => $query->where('auditable_type', $request->auditable_type))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date_to))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery->where('action', 'like', "%{$search}%")
                        ->orWhere('auditable_type', 'like', "%{$search}%")
                        ->orWhere('auditable_id', $search)
                        ->orWhere('ip_address', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 25))
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'actor' => $log->user,
                'auditable_type' => $log->auditable_type,
                'auditable_label' => $this->auditableLabel($log->auditable_type),
                'auditable_id' => $log->auditable_id,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'created_at' => $log->created_at,
            ]);
    }

    public function clear()
    {
        $deletedCount = ActivityLogService::withoutLogging(fn () => AuditLog::query()->delete());

        return response()->json([
            'deleted_count' => $deletedCount,
            'message' => 'Activity logs cleared.',
        ]);
    }

    private function auditableLabel(?string $type): string
    {
        if (! $type) {
            return 'System';
        }

        return Str::of(class_basename($type))->headline()->toString();
    }
}
