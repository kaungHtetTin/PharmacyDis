<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class NumberGeneratorService
{
    public function next(string $modelClass, string $column, string $prefix): string
    {
        /** @var Model $model */
        $model = new $modelClass();
        $date = now()->format('Ymd');
        $query = $model->newQuery();

        if (in_array(SoftDeletes::class, class_uses_recursive($modelClass), true)) {
            $query->withTrashed();
        }

        $latestNumber = $query
            ->where($column, 'like', "{$prefix}-{$date}-%")
            ->orderByDesc($column)
            ->value($column);
        $sequence = $latestNumber ? ((int) substr($latestNumber, -4)) + 1 : 1;

        return sprintf('%s-%s-%04d', $prefix, $date, $sequence);
    }
}
