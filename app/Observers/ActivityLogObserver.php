<?php

namespace App\Observers;

use App\Services\ActivityLogService;
use Illuminate\Database\Eloquent\Model;

class ActivityLogObserver
{
    private array $ignoredAttributes = [
        'created_at',
        'deleted_at',
        'email_verified_at',
        'last_login_at',
        'password',
        'remember_token',
        'updated_at',
    ];

    public function created(Model $model): void
    {
        ActivityLogService::record('created', $model, null, $this->filterAttributes($model->getAttributes()));
    }

    public function updated(Model $model): void
    {
        $changes = $this->filterAttributes($model->getChanges());

        if ($changes === []) {
            return;
        }

        $oldValues = [];
        $newValues = [];

        foreach (array_keys($changes) as $key) {
            $oldValues[$key] = $this->normalizeValue($model->getOriginal($key));
            $newValues[$key] = $this->normalizeValue($model->getAttribute($key));
        }

        ActivityLogService::record('updated', $model, $oldValues, $newValues);
    }

    public function deleted(Model $model): void
    {
        $action = method_exists($model, 'isForceDeleting') && $model->isForceDeleting()
            ? 'deleted'
            : 'soft_deleted';

        ActivityLogService::record($action, $model, $this->filterAttributes($model->getAttributes()), null);
    }

    public function restored(Model $model): void
    {
        ActivityLogService::record('restored', $model, null, $this->filterAttributes($model->getAttributes()));
    }

    private function filterAttributes(array $attributes): array
    {
        return collect($attributes)
            ->reject(fn ($value, string $key) => in_array($key, $this->ignoredAttributes, true) || $this->isSensitiveKey($key))
            ->map(fn ($value) => $this->normalizeValue($value))
            ->all();
    }

    private function isSensitiveKey(string $key): bool
    {
        return str_contains($key, 'password')
            || str_contains($key, 'token')
            || str_contains($key, 'secret');
    }

    private function normalizeValue($value)
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format(DATE_ATOM);
        }

        return $value;
    }
}
