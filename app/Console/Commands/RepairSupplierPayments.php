<?php

namespace App\Console\Commands;

use App\Models\CompanyPayable;
use App\Models\FinancialDataRepair;
use App\Models\StockReceipt;
use App\Services\CompanyPaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RepairSupplierPayments extends Command
{
    protected $signature = 'finance:repair-supplier-payments
        {--apply : Create missing linked payment transactions}
        {--dry-run : Explicitly confirm no-write preview mode}
        {--repair-version=2026-08-22-v1}
        {--from-id= : First payable ID}
        {--to-id= : Last payable ID}
        {--chunk=200 : Payables loaded per chunk}
        {--output= : Write JSON results to this path}';

    protected $description = 'Find receipt/payable paid amounts missing from company payments; dry-run unless --apply is supplied.';

    public function handle(CompanyPaymentService $paymentService): int
    {
        if ($this->option('apply') && $this->option('dry-run')) {
            $this->error('Choose either --apply or --dry-run, not both.');
            return self::INVALID;
        }

        $apply = (bool) $this->option('apply');
        $version = (string) $this->option('repair-version');
        $query = CompanyPayable::query()->with('stockReceipt')->where('paid_amount', '>', 0)
            ->when($this->option('from-id'), fn ($query) => $query->where('id', '>=', (int) $this->option('from-id')))
            ->when($this->option('to-id'), fn ($query) => $query->where('id', '<=', (int) $this->option('to-id')));
        $rows = collect();
        $query->orderBy('id')->chunkById(max(1, (int) $this->option('chunk')), function ($payables) use (&$rows) {
            $rows->push(...$payables->map(function ($payable) {
                $linked = (float) $payable->payments()->sum('amount');
                return ['payable' => $payable, 'missing' => round((float) $payable->paid_amount - $linked, 2)];
            }));
        });
        $overpaidRows = $rows->filter(fn ($row) => $row['missing'] < -0.01)->values();
        $rows = $rows->filter(fn ($row) => $row['missing'] > 0.01)->values();

        $resultRows = [];
        foreach ($rows as $row) {
            $payable = $row['payable'];
            $receipt = $payable->stockReceipt;
            $repairKey = "{$version}:supplier-payment:{$payable->id}";
            $resultRows[] = [
                'payable_id' => $payable->id,
                'receipt_no' => $receipt?->receipt_no,
                'company_id' => $payable->company_id,
                'missing_amount' => $row['missing'],
                'payment_date' => $receipt?->received_date?->toDateString() ?? $payable->payable_date?->toDateString(),
            ];

            if (! $apply || FinancialDataRepair::where('repair_key', $repairKey)->exists()) {
                continue;
            }

            DB::transaction(function () use ($paymentService, $payable, $receipt, $row, $repairKey, $version) {
                $payment = $paymentService->recordReconciliation([
                    'company_id' => $payable->company_id,
                    'company_payable_id' => $payable->id,
                    'payment_date' => $receipt?->received_date?->toDateString() ?? $payable->payable_date?->toDateString(),
                    'amount' => $row['missing'],
                    'payment_method' => 'other',
                    'reference_no' => $receipt?->supplier_invoice_no,
                    'note' => 'Historical initial supplier payment reconstructed from paid payable.',
                    'source_type' => StockReceipt::class,
                    'source_id' => $receipt?->id,
                    'idempotency_key' => "repair:{$repairKey}",
                ]);
                FinancialDataRepair::create([
                    'repair_key' => $repairKey,
                    'repair_version' => $version,
                    'target_table' => 'company_payments',
                    'target_id' => $payment->id,
                    'after_values' => $payment->only(['id', 'payment_no', 'company_payable_id', 'amount', 'payment_date']),
                    'reason' => 'Create missing cash transaction for historical paid receipt/payable.',
                    'executed_at' => now(),
                ]);
            });
        }

        $result = [
            'mode' => $apply ? 'apply' : 'dry-run',
            'count' => count($resultRows),
            'missing_amount_total' => round((float) collect($resultRows)->sum('missing_amount'), 2),
            'rows' => $resultRows,
            'overpaid_payable_count' => $overpaidRows->count(),
            'overpaid_payable_amount' => round(abs((float) $overpaidRows->sum('missing')), 2),
        ];
        $json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $this->line($json);
        if ($path = $this->option('output')) {
            file_put_contents($path, $json . PHP_EOL);
        }

        return $overpaidRows->isEmpty() ? self::SUCCESS : self::FAILURE;
    }
}
