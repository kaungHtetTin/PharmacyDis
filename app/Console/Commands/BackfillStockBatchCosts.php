<?php

namespace App\Console\Commands;

use App\Models\StockBatch;
use App\Services\StockCostService;
use Illuminate\Console\Command;

class BackfillStockBatchCosts extends Command
{
    protected $signature = 'stock:backfill-batch-costs
        {--apply : Persist resolved costs}
        {--dry-run : Explicitly confirm no-write preview mode}
        {--from-id= : First stock batch ID}
        {--to-id= : Last stock batch ID}
        {--chunk=200 : Batches processed per database chunk}
        {--output= : Write JSON results to this path}';

    protected $description = 'Backfill missing stock batch base-unit costs without changing stock quantities';

    public function handle(StockCostService $stockCostService): int
    {
        $updated = 0;
        $unresolved = 0;
        if ($this->option('apply') && $this->option('dry-run')) {
            $this->error('Choose either --apply or --dry-run, not both.');
            return self::INVALID;
        }
        $dryRun = ! $this->option('apply');
        $chunkSize = max(1, (int) $this->option('chunk'));
        $resolvedValue = 0.0;
        $rows = [];

        StockBatch::query()
            ->whereNull('base_unit_cost')
            ->when($this->option('from-id'), fn ($query) => $query->where('id', '>=', (int) $this->option('from-id')))
            ->when($this->option('to-id'), fn ($query) => $query->where('id', '<=', (int) $this->option('to-id')))
            ->orderBy('id')
            ->chunkById($chunkSize, function ($batches) use ($stockCostService, $dryRun, &$updated, &$unresolved, &$resolvedValue, &$rows) {
                foreach ($batches as $batch) {
                    [$cost, $source] = $stockCostService->historicalBatchCost($batch);

                    if ($cost === null) {
                        $unresolved++;
                        $rows[] = ['batch_id' => $batch->id, 'status' => 'unresolved'];
                        continue;
                    }

                    if (! $dryRun) {
                        $batch->update([
                            'base_unit_cost' => $cost,
                            'cost_source' => $source,
                        ]);
                    }

                    $updated++;
                    $value = round((int) $batch->available_base_quantity * (float) $cost, 2);
                    $resolvedValue += $value;
                    $rows[] = [
                        'batch_id' => $batch->id,
                        'base_unit_cost' => $cost,
                        'cost_source' => $source,
                        'available_base_quantity' => (int) $batch->available_base_quantity,
                        'resolved_available_value' => $value,
                    ];
                }
            });

        $verb = $dryRun ? 'Would update' : 'Updated';
        $this->info("{$verb} {$updated} stock batches; {$unresolved} remain unresolved.");
        $result = [
            'mode' => $dryRun ? 'dry-run' : 'apply',
            'resolved_batch_count' => $updated,
            'unresolved_batch_count' => $unresolved,
            'resolved_available_value' => round($resolvedValue, 2),
            'rows' => $rows,
        ];
        if ($path = $this->option('output')) {
            file_put_contents($path, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
        }

        return $unresolved === 0 ? self::SUCCESS : self::FAILURE;
    }
}
