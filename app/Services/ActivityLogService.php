<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Throwable;

class ActivityLogService
{
    private static bool $disabled = false;

    public static function withoutLogging(callable $callback)
    {
        $wasDisabled = self::$disabled;
        self::$disabled = true;

        try {
            return $callback();
        } finally {
            self::$disabled = $wasDisabled;
        }
    }

    public static function record(
        string $action,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?User $user = null
    ): ?AuditLog {
        if (self::$disabled) {
            return null;
        }

        try {
            return self::withoutLogging(function () use ($action, $auditable, $oldValues, $newValues, $user) {
                $request = app()->bound('request') ? request() : null;

                return AuditLog::create([
                    'user_id' => $user?->getKey() ?? auth()->id(),
                    'action' => $action,
                    'auditable_type' => $auditable ? get_class($auditable) : null,
                    'auditable_id' => $auditable?->getKey(),
                    'old_values' => $oldValues,
                    'new_values' => $newValues,
                    'ip_address' => $request?->ip(),
                    'user_agent' => $request ? substr((string) $request->userAgent(), 0, 255) : null,
                ]);
            });
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }
}
