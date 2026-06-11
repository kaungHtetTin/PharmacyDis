<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

class NumberGeneratorService
{
    public function next(string $modelClass, string $column, string $prefix): string
    {
        /** @var Model $model */
        $model = new $modelClass();
        $count = $model->newQuery()->whereDate('created_at', now()->toDateString())->count() + 1;

        return sprintf('%s-%s-%04d', $prefix, now()->format('Ymd'), $count);
    }
}
