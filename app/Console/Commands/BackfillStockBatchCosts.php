<?php

namespace App\Console\Commands;

use App\Models\StockBatch;
use App\Services\StockCostService;
use Illuminate\Console\Command;

class BackfillStockBatchCosts extends Command
{
    protected $signature = 'stock:backfill-batch-costs {--chunk=200 : Batches processed per database chunk} {--dry-run : Report changes without saving them}';

    protected $description = 'Backfill missing stock batch base-unit costs without changing stock quantities';

    public function handle(StockCostService $stockCostService): int
    {
        $updated = 0;
        $unresolved = 0;
        $dryRun = (bool) $this->option('dry-run');
        $chunkSize = max(1, (int) $this->option('chunk'));

        StockBatch::query()
            ->whereNull('base_unit_cost')
            ->orderBy('id')
            ->chunkById($chunkSize, function ($batches) use ($stockCostService, $dryRun, &$updated, &$unresolved) {
                foreach ($batches as $batch) {
                    [$cost, $source] = $stockCostService->historicalBatchCost($batch);

                    if ($cost === null) {
                        $unresolved++;
                        continue;
                    }

                    if (! $dryRun) {
                        $batch->update([
                            'base_unit_cost' => $cost,
                            'cost_source' => $source,
                        ]);
                    }

                    $updated++;
                }
            });

        $verb = $dryRun ? 'Would update' : 'Updated';
        $this->info("{$verb} {$updated} stock batches; {$unresolved} remain unresolved.");

        return self::SUCCESS;
    }
}
