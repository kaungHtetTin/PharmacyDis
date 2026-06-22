<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function financeOverview(Request $request)
    {
        $duration = in_array($request->query('duration'), ['month', 'year'], true)
            ? $request->query('duration')
            : 'month';
        $year = $this->normalizedYear($request);
        $month = $this->normalizedMonth($request);
        [$start, $end, $durationLabel] = $this->reportDateRange($request, $duration, $year, $month);
        $companyId = $request->filled('company_id') ? $request->query('company_id') : null;
        $companyName = $companyId ? DB::table('companies')->where('id', $companyId)->value('name') : null;
        $includeFreeLedger = ! $companyId;
        $buckets = $this->financeBuckets($duration, $start, $end);

        $invoiceQuery = DB::table('invoices')
            ->whereNull('deleted_at')
            ->where('status', '!=', 'void')
            ->whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));

        $customerPaymentQuery = DB::table('payments')
            ->whereNull('deleted_at')
            ->whereBetween('payment_date', [$start->toDateString(), $end->toDateString()])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));

        $companyPaymentQuery = DB::table('company_payments')
            ->whereNull('deleted_at')
            ->whereBetween('payment_date', [$start->toDateString(), $end->toDateString()])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));

        $ledgerQuery = DB::table('finance_transactions')
            ->whereNull('deleted_at')
            ->where('status', 'recorded')
            ->whereBetween('transaction_date', [$start->toDateString(), $end->toDateString()]);

        $salesReturnQuery = DB::table('sales_returns')
            ->whereNull('deleted_at')
            ->where('status', 'posted')
            ->whereBetween('return_date', [$start->toDateString(), $end->toDateString()])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId));

        $salesTotal = (float) (clone $invoiceQuery)->sum('total_amount');
        $salesReturnTotal = (float) (clone $salesReturnQuery)->sum('total_amount');
        $salesReturnCount = (int) (clone $salesReturnQuery)->count();
        $invoiceCount = (int) (clone $invoiceQuery)->count();
        $receivableTotal = (float) (clone $invoiceQuery)->sum('balance_amount');
        $customerIncome = (float) (clone $customerPaymentQuery)->sum('amount');
        $supplierOutcome = (float) (clone $companyPaymentQuery)->sum('amount');
        $ledgerIncome = $includeFreeLedger ? (float) (clone $ledgerQuery)->where('direction', 'income')->sum('amount') : 0.0;
        $ledgerOutcome = $includeFreeLedger ? (float) (clone $ledgerQuery)->where('direction', 'outcome')->sum('amount') : 0.0;
        $incomeTotal = $customerIncome + $ledgerIncome;
        $outcomeTotal = $supplierOutcome + $ledgerOutcome;
        $netCash = $incomeTotal - $outcomeTotal;
        $payableTotal = (float) DB::table('company_payables')
            ->whereNull('deleted_at')
            ->whereBetween('payable_date', [$start->toDateString(), $end->toDateString()])
            ->when($companyId, fn ($query) => $query->where('company_id', $companyId))
            ->sum('balance_amount');
        $stockHoldingValue = $this->stockHoldingValue($companyId);
        $collectionRate = $salesTotal > 0 ? round(($incomeTotal / $salesTotal) * 100, 1) : 0;
        $profitMargin = $incomeTotal > 0 ? round(($netCash / $incomeTotal) * 100, 1) : 0;

        $incomeBuckets = $this->emptyFinanceBucketValues($buckets);
        foreach ((clone $customerPaymentQuery)->select('payment_date', 'amount')->get() as $row) {
            $key = $this->financeBucketKey($row->payment_date, $duration);
            $incomeBuckets[$key] = ($incomeBuckets[$key] ?? 0) + (float) $row->amount;
        }
        if ($includeFreeLedger) {
            foreach ((clone $ledgerQuery)->where('direction', 'income')->select('transaction_date', 'amount')->get() as $row) {
                $key = $this->financeBucketKey($row->transaction_date, $duration);
                $incomeBuckets[$key] = ($incomeBuckets[$key] ?? 0) + (float) $row->amount;
            }
        }

        $outcomeBuckets = $this->emptyFinanceBucketValues($buckets);
        foreach ((clone $companyPaymentQuery)->select('payment_date', 'amount')->get() as $row) {
            $key = $this->financeBucketKey($row->payment_date, $duration);
            $outcomeBuckets[$key] = ($outcomeBuckets[$key] ?? 0) + (float) $row->amount;
        }
        if ($includeFreeLedger) {
            foreach ((clone $ledgerQuery)->where('direction', 'outcome')->select('transaction_date', 'amount')->get() as $row) {
                $key = $this->financeBucketKey($row->transaction_date, $duration);
                $outcomeBuckets[$key] = ($outcomeBuckets[$key] ?? 0) + (float) $row->amount;
            }
        }

        $netBuckets = [];
        foreach (array_keys($incomeBuckets) as $key) {
            $netBuckets[$key] = round(($incomeBuckets[$key] ?? 0) - ($outcomeBuckets[$key] ?? 0), 2);
        }

        $performanceRows = $companyId
            ? $this->financeTopPharmacies($start, $end, $companyId)
            : $this->financeTopCompanies($start, $end);
        $maxPerformance = max(1, (float) $performanceRows->max('sales_total'));
        $topPerformance = $performanceRows->first();
        $tableLabel = $companyId ? 'Pharmacy' : 'Company';

        return [
            'metrics' => [
                ['label' => 'Invoice sales', 'value' => number_format($salesTotal), 'note' => "{$invoiceCount} invoices in {$durationLabel}"],
                ['label' => 'Sales returns', 'value' => number_format($salesReturnTotal), 'note' => "{$salesReturnCount} returns posted in {$durationLabel}"],
                ['label' => 'Cash income', 'value' => number_format($incomeTotal), 'note' => $includeFreeLedger ? 'Customer payments + free ledger income' : 'Customer payments for selected company'],
                ['label' => 'Outcome', 'value' => number_format($outcomeTotal), 'note' => $includeFreeLedger ? 'Supplier payments + free ledger outcome' : 'Supplier payments for selected company'],
                ['label' => 'Net cash', 'value' => number_format($netCash), 'note' => 'Income minus outcome'],
                ['label' => 'Receivable', 'value' => number_format($receivableTotal), 'note' => 'Open invoice balance in period'],
                ['label' => 'Stock holding value', 'value' => number_format($stockHoldingValue), 'note' => 'Available warehouse stock at receipt cost'],
                ['label' => 'Profit margin', 'value' => "{$profitMargin}%", 'note' => 'Net cash against income'],
            ],
            'lineChart' => [
                'eyebrow' => 'Profit Trend',
                'title' => 'Income, outcome, and net cash - ' . $durationLabel,
                'labels' => array_column($buckets, 'label'),
                'series' => [
                    ['label' => 'Income', 'color' => '#087f74', 'values' => array_values($incomeBuckets), 'total' => number_format($incomeTotal)],
                    ['label' => 'Outcome', 'color' => '#d97706', 'values' => array_values($outcomeBuckets), 'total' => number_format($outcomeTotal)],
                    ['label' => 'Net cash', 'color' => '#2563eb', 'values' => array_values($netBuckets), 'total' => number_format($netCash)],
                ],
            ],
            'barChart' => [
                'eyebrow' => $companyId ? 'Marketing Analysis' : 'Company Performance',
                'title' => ($companyId ? 'Top pharmacies by sales - ' : 'Top companies by sales - ') . $durationLabel,
                'series' => $performanceRows->map(fn ($row) => [
                    'label' => $row->name ?: "{$tableLabel} #{$row->id}",
                    'value' => (float) $row->sales_total,
                    'displayValue' => number_format((float) $row->sales_total),
                    'percent' => (int) round(((float) $row->sales_total / $maxPerformance) * 100),
                    'note' => number_format((int) $row->invoice_count) . ' invoices / ' . number_format((float) $row->balance_total) . ' balance',
                ])->values(),
            ],
            'insights' => [
                [
                    'label' => 'Cash health',
                    'value' => $netCash >= 0 ? 'Positive' : 'Negative',
                    'note' => number_format(abs($netCash)) . ($netCash >= 0 ? ' surplus after outcome' : ' shortfall after outcome'),
                ],
                [
                    'label' => 'Collection performance',
                    'value' => "{$collectionRate}%",
                    'note' => 'Cash income collected against invoice sales',
                ],
                [
                    'label' => $companyId ? 'Marketing focus' : 'Best company',
                    'value' => $topPerformance?->name ?: 'No sales',
                    'note' => $topPerformance ? number_format((float) $topPerformance->sales_total) . ' sales in period' : 'Try another month or year',
                ],
                [
                    'label' => 'Payable pressure',
                    'value' => number_format($payableTotal),
                    'note' => 'Supplier payable balance in selected period',
                ],
            ],
            'summary' => [
                ['label' => 'Company', 'value' => $companyName ?: 'All companies', 'note' => 'Page-level filter'],
                ['label' => 'Duration', 'value' => $durationLabel, 'note' => $start->toDateString() . ' to ' . $end->toDateString()],
                ['label' => 'Ledger scope', 'value' => $includeFreeLedger ? 'Included' : 'Company-only', 'note' => $includeFreeLedger ? 'Free finance ledger is included in cash totals' : 'Free finance ledger is excluded because it is not linked to company'],
            ],
            'tableColumns' => [
                ['key' => 'rank', 'label' => 'Rank'],
                ['key' => 'name', 'label' => $tableLabel],
                ['key' => 'invoices', 'label' => 'Invoices'],
                ['key' => 'sales', 'label' => 'Sales'],
                ['key' => 'balance', 'label' => 'Balance'],
                ['key' => 'share', 'label' => 'Sales share'],
            ],
            'tableRows' => $performanceRows->values()->map(fn ($row, $index) => [
                'id' => $row->id,
                'rank' => '#' . ($index + 1),
                'name' => trim(($row->code ? "{$row->code} / " : '') . ($row->name ?: "{$tableLabel} #{$row->id}")),
                'invoices' => number_format((int) $row->invoice_count),
                'sales' => number_format((float) $row->sales_total),
                'balance' => number_format((float) $row->balance_total),
                'share' => $salesTotal > 0 ? round(((float) $row->sales_total / $salesTotal) * 100, 1) . '%' : '0%',
            ]),
        ];
    }

    public function topPharmacies(Request $request)
    {
        $duration = in_array($request->query('duration'), ['today', 'week', 'month', 'year'], true)
            ? $request->query('duration')
            : 'month';
        $year = $this->normalizedYear($request);
        $month = $this->normalizedMonth($request);
        [$start, $end, $durationLabel] = $this->reportDateRange($request, $duration, $year, $month);

        $rows = DB::table('invoices')
            ->join('customers', 'customers.id', '=', 'invoices.customer_id')
            ->join('companies', 'companies.id', '=', 'invoices.company_id')
            ->whereBetween('invoices.invoice_date', [$start->toDateString(), $end->toDateString()])
            ->when($request->filled('company_id'), fn ($query) => $query->where('invoices.company_id', $request->company_id))
            ->select([
                'customers.id',
                'customers.code',
                'customers.name as pharmacy',
                DB::raw('MIN(companies.name) as company'),
                DB::raw('COUNT(DISTINCT invoices.company_id) as company_count'),
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw('SUM(invoices.total_amount) as sales_total'),
                DB::raw('SUM(invoices.balance_amount) as balance_total'),
            ])
            ->groupBy('customers.id', 'customers.code', 'customers.name')
            ->orderByDesc('sales_total')
            ->limit(10)
            ->get();

        $totalSales = (float) $rows->sum('sales_total');
        $invoiceCount = (int) $rows->sum('invoice_count');
        $balanceTotal = (float) $rows->sum('balance_total');
        $maxSales = max(1, (float) $rows->max('sales_total'));
        $topRow = $rows->first();
        $topShare = $totalSales > 0 && $topRow ? round(((float) $topRow->sales_total / $totalSales) * 100) : 0;

        return [
            'metrics' => [
                [
                    'label' => 'Sales total',
                    'value' => number_format($totalSales),
                    'note' => $durationLabel,
                ],
                [
                    'label' => 'Invoices',
                    'value' => number_format($invoiceCount),
                    'note' => 'Issued in selected period',
                ],
                [
                    'label' => 'Average invoice',
                    'value' => number_format($invoiceCount > 0 ? $totalSales / $invoiceCount : 0),
                    'note' => 'Sales total per invoice',
                ],
                [
                    'label' => 'Top pharmacy',
                    'value' => $topRow?->pharmacy ?: '-',
                    'note' => $topRow ? number_format((float) $topRow->sales_total) . ' sales' : 'No sales in period',
                ],
                [
                    'label' => 'Outstanding',
                    'value' => number_format($balanceTotal),
                    'note' => 'Open balance from ranked pharmacies',
                ],
            ],
            'chart' => [
                'eyebrow' => 'Top 10 Sales',
                'title' => 'Top 10 pharmacies - ' . $durationLabel,
                'type' => 'bar',
                'series' => $rows->map(fn ($row) => [
                    'label' => $row->pharmacy ?: "Pharmacy #{$row->id}",
                    'value' => number_format((float) $row->sales_total),
                    'percent' => (int) round(((float) $row->sales_total / $maxSales) * 100),
                    'note' => $this->companyScopeLabel($row) . " / {$row->invoice_count} invoices",
                ])->values(),
            ],
            'insights' => [
                [
                    'label' => 'Best pharmacy',
                    'value' => $topRow?->pharmacy ?: 'No sales',
                    'note' => $topRow ? $this->companyScopeLabel($topRow) . ' leads this period' : 'Try another duration or company',
                ],
                [
                    'label' => 'Sales concentration',
                    'value' => "{$topShare}%",
                    'note' => 'Share of selected-period sales from rank #1',
                ],
                [
                    'label' => 'Receivable pressure',
                    'value' => number_format($balanceTotal),
                    'note' => 'Outstanding balance inside the top 10',
                ],
            ],
            'summary' => [
                [
                    'label' => 'Company',
                    'value' => $request->filled('company_id') ? ($rows->first()?->company ?: 'Filtered') : 'All companies',
                    'note' => 'Page-level filter',
                ],
                [
                    'label' => 'Duration',
                    'value' => $durationLabel,
                    'note' => $start->toDateString() . ' to ' . $end->toDateString(),
                ],
            ],
            'tableColumns' => [
                ['key' => 'rank', 'label' => 'Rank'],
                ['key' => 'pharmacy', 'label' => 'Pharmacy'],
                ['key' => 'company', 'label' => 'Company'],
                ['key' => 'invoices', 'label' => 'Invoices'],
                ['key' => 'sales', 'label' => 'Sales'],
                ['key' => 'balance', 'label' => 'Balance'],
            ],
            'tableRows' => $rows->values()->map(fn ($row, $index) => [
                'id' => $row->id,
                'rank' => '#' . ($index + 1),
                'pharmacy' => trim(($row->code ? "{$row->code} / " : '') . ($row->pharmacy ?: "Pharmacy #{$row->id}")),
                'company' => $this->companyScopeLabel($row),
                'invoices' => number_format((int) $row->invoice_count),
                'sales' => number_format((float) $row->sales_total),
                'balance' => number_format((float) $row->balance_total),
            ]),
        ];
    }

    public function topSalesRepresentatives(Request $request)
    {
        $duration = in_array($request->query('duration'), ['today', 'week', 'month', 'year'], true)
            ? $request->query('duration')
            : 'month';
        $year = $this->normalizedYear($request);
        $month = $this->normalizedMonth($request);
        [$start, $end, $durationLabel] = $this->reportDateRange($request, $duration, $year, $month);

        $rows = DB::table('invoices')
            ->join('sales_representatives', 'sales_representatives.id', '=', 'invoices.sales_representative_id')
            ->join('users', 'users.id', '=', 'sales_representatives.user_id')
            ->join('companies', 'companies.id', '=', 'invoices.company_id')
            ->whereBetween('invoices.invoice_date', [$start->toDateString(), $end->toDateString()])
            ->when($request->filled('company_id'), fn ($query) => $query->where('invoices.company_id', $request->company_id))
            ->select([
                'sales_representatives.id',
                'sales_representatives.employee_code',
                'users.name as representative',
                'companies.name as company',
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw('SUM(invoices.total_amount) as sales_total'),
            ])
            ->groupBy('sales_representatives.id', 'sales_representatives.employee_code', 'users.name', 'companies.name')
            ->orderByDesc('sales_total')
            ->limit(10)
            ->get();

        $totalSales = (float) $rows->sum('sales_total');
        $invoiceCount = (int) $rows->sum('invoice_count');
        $maxSales = max(1, (float) $rows->max('sales_total'));
        $topRow = $rows->first();
        $topShare = $totalSales > 0 && $topRow ? round(((float) $topRow->sales_total / $totalSales) * 100) : 0;

        return [
            'metrics' => [
                [
                    'label' => 'Sales total',
                    'value' => number_format($totalSales),
                    'note' => $durationLabel,
                ],
                [
                    'label' => 'Invoices',
                    'value' => number_format($invoiceCount),
                    'note' => 'Issued in selected period',
                ],
                [
                    'label' => 'Average invoice',
                    'value' => number_format($invoiceCount > 0 ? $totalSales / $invoiceCount : 0),
                    'note' => 'Sales total per invoice',
                ],
                [
                    'label' => 'Top rep',
                    'value' => $topRow?->representative ?: '-',
                    'note' => $topRow ? number_format((float) $topRow->sales_total) . ' sales' : 'No sales in period',
                ],
                [
                    'label' => 'Ranked reps',
                    'value' => number_format($rows->count()),
                    'note' => 'Top performers shown',
                ],
            ],
            'chart' => [
                'eyebrow' => 'Top 10 Sales',
                'title' => 'Top 10 sales reps - ' . $durationLabel,
                'type' => 'bar',
                'series' => $rows->map(fn ($row) => [
                    'label' => $row->representative ?: "Rep #{$row->id}",
                    'value' => number_format((float) $row->sales_total),
                    'percent' => (int) round(((float) $row->sales_total / $maxSales) * 100),
                    'note' => "{$row->company} / {$row->invoice_count} invoices",
                ])->values(),
            ],
            'insights' => [
                [
                    'label' => 'Best performer',
                    'value' => $topRow?->representative ?: 'No sales',
                    'note' => $topRow ? "{$topRow->company} leads this period" : 'Try another duration or company',
                ],
                [
                    'label' => 'Sales concentration',
                    'value' => "{$topShare}%",
                    'note' => 'Share of selected-period sales from rank #1',
                ],
                [
                    'label' => 'Coverage',
                    'value' => $rows->count() ? $rows->count() . ' reps' : 'No reps',
                    'note' => $request->filled('company_id') ? 'Filtered by selected company' : 'Across all companies',
                ],
            ],
            'summary' => [
                [
                    'label' => 'Company',
                    'value' => $request->filled('company_id') ? ($rows->first()?->company ?: 'Filtered') : 'All companies',
                    'note' => 'Page-level filter',
                ],
                [
                    'label' => 'Duration',
                    'value' => $durationLabel,
                    'note' => $start->toDateString() . ' to ' . $end->toDateString(),
                ],
            ],
            'tableColumns' => [
                ['key' => 'rank', 'label' => 'Rank'],
                ['key' => 'representative', 'label' => 'Sales rep'],
                ['key' => 'company', 'label' => 'Company'],
                ['key' => 'invoices', 'label' => 'Invoices'],
                ['key' => 'sales', 'label' => 'Sales'],
            ],
            'tableRows' => $rows->values()->map(fn ($row, $index) => [
                'id' => $row->id,
                'rank' => '#' . ($index + 1),
                'representative' => trim(($row->employee_code ? "{$row->employee_code} / " : '') . ($row->representative ?: "Rep #{$row->id}")),
                'company' => $row->company,
                'invoices' => number_format((int) $row->invoice_count),
                'sales' => number_format((float) $row->sales_total),
            ]),
        ];
    }

    private function dateRange(string $duration, int $year, int $month): array
    {
        $selectedMonth = now()->setDate($year, $month, 1);
        $selectedYear = now()->setDate($year, 1, 1);

        return match ($duration) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'week' => [now()->startOfWeek(), now()->endOfWeek()],
            'year' => [$selectedYear->copy()->startOfYear(), $selectedYear->copy()->endOfYear()],
            default => [$selectedMonth->copy()->startOfMonth(), $selectedMonth->copy()->endOfMonth()],
        };
    }

    private function durationLabel(string $duration, int $year, int $month): string
    {
        $selectedMonth = now()->setDate($year, $month, 1);

        return match ($duration) {
            'today' => 'Today',
            'week' => 'This week',
            'year' => (string) $year,
            default => $selectedMonth->format('M Y'),
        };
    }

    private function reportDateRange(Request $request, string $duration, int $year, int $month): array
    {
        [$start, $end] = $this->dateRange($duration, $year, $month);
        $label = $this->durationLabel($duration, $year, $month);

        if ($request->filled('date_from') || $request->filled('date_to')) {
            $start = $request->filled('date_from')
                ? Carbon::parse($request->query('date_from'))->startOfDay()
                : $start;
            $end = $request->filled('date_to')
                ? Carbon::parse($request->query('date_to'))->endOfDay()
                : $end;

            if ($end->lt($start)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }

            $label = $start->isSameDay($end)
                ? $start->format('M j, Y')
                : $start->format('M j, Y') . ' - ' . $end->format('M j, Y');
        }

        return [$start, $end, $label];
    }

    private function normalizedYear(Request $request): int
    {
        $year = (int) $request->query('year', now()->year);

        return $year >= 2000 && $year <= 2100 ? $year : (int) now()->year;
    }

    private function normalizedMonth(Request $request): int
    {
        $month = (int) $request->query('month', now()->month);

        return $month >= 1 && $month <= 12 ? $month : (int) now()->month;
    }

    private function companyScopeLabel(object $row): string
    {
        $companyCount = (int) ($row->company_count ?? 1);

        return $companyCount > 1 ? "{$companyCount} companies" : ($row->company ?: 'Company');
    }

    private function financeBuckets(string $duration, Carbon $start, Carbon $end): array
    {
        $buckets = [];
        $cursor = $start->copy();

        while ($cursor <= $end) {
            $buckets[] = [
                'key' => $duration === 'year' ? $cursor->format('Y-m') : $cursor->format('Y-m-d'),
                'label' => $duration === 'year' ? $cursor->format('M') : $cursor->format('j M'),
            ];

            $duration === 'year' ? $cursor->addMonth() : $cursor->addDay();
        }

        return $buckets;
    }

    private function emptyFinanceBucketValues(array $buckets): array
    {
        return collect($buckets)->mapWithKeys(fn ($bucket) => [$bucket['key'] => 0.0])->all();
    }

    private function financeBucketKey(string $date, string $duration): string
    {
        $value = Carbon::parse($date);

        return $duration === 'year' ? $value->format('Y-m') : $value->format('Y-m-d');
    }

    private function stockHoldingValue(?string $companyId = null): float
    {
        $batchCosts = $this->receiptBatchCostSubquery();

        return (float) DB::table('stock_batches')
            ->leftJoinSub($batchCosts, 'batch_costs', function ($join) {
                $join->on('batch_costs.company_id', '=', 'stock_batches.company_id')
                    ->on('batch_costs.product_id', '=', 'stock_batches.product_id')
                    ->whereRaw("batch_costs.batch_key = COALESCE(stock_batches.batch_no, '')")
                    ->whereRaw("batch_costs.expiry_key = COALESCE(stock_batches.expiry_date, '1000-01-01')");
            })
            ->when($companyId, fn ($query) => $query->where('stock_batches.company_id', $companyId))
            ->sum(DB::raw('stock_batches.available_base_quantity * COALESCE(batch_costs.base_unit_cost, 0)'));
    }

    private function receiptBatchCostSubquery()
    {
        return DB::table('stock_receipt_items')
            ->join('stock_receipts', 'stock_receipts.id', '=', 'stock_receipt_items.stock_receipt_id')
            ->whereNull('stock_receipts.deleted_at')
            ->selectRaw("
                stock_receipts.company_id,
                stock_receipt_items.product_id,
                COALESCE(stock_receipt_items.batch_no, '') as batch_key,
                COALESCE(stock_receipt_items.expiry_date, '1000-01-01') as expiry_key,
                COALESCE(SUM(stock_receipt_items.line_total) / NULLIF(SUM(stock_receipt_items.base_unit_quantity), 0), 0) as base_unit_cost
            ")
            ->groupBy(
                'stock_receipts.company_id',
                'stock_receipt_items.product_id',
                DB::raw("COALESCE(stock_receipt_items.batch_no, '')"),
                DB::raw("COALESCE(stock_receipt_items.expiry_date, '1000-01-01')")
            );
    }

    private function financeTopCompanies(Carbon $start, Carbon $end)
    {
        return DB::table('invoices')
            ->join('companies', 'companies.id', '=', 'invoices.company_id')
            ->whereNull('invoices.deleted_at')
            ->where('invoices.status', '!=', 'void')
            ->whereBetween('invoices.invoice_date', [$start->toDateString(), $end->toDateString()])
            ->select([
                'companies.id',
                'companies.code',
                'companies.name',
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw('SUM(invoices.total_amount) as sales_total'),
                DB::raw('SUM(invoices.balance_amount) as balance_total'),
            ])
            ->groupBy('companies.id', 'companies.code', 'companies.name')
            ->orderByDesc('sales_total')
            ->limit(10)
            ->get();
    }

    private function financeTopPharmacies(Carbon $start, Carbon $end, string $companyId)
    {
        return DB::table('invoices')
            ->join('customers', 'customers.id', '=', 'invoices.customer_id')
            ->whereNull('invoices.deleted_at')
            ->where('invoices.status', '!=', 'void')
            ->where('invoices.company_id', $companyId)
            ->whereBetween('invoices.invoice_date', [$start->toDateString(), $end->toDateString()])
            ->select([
                'customers.id',
                'customers.code',
                'customers.name',
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw('SUM(invoices.total_amount) as sales_total'),
                DB::raw('SUM(invoices.balance_amount) as balance_total'),
            ])
            ->groupBy('customers.id', 'customers.code', 'customers.name')
            ->orderByDesc('sales_total')
            ->limit(10)
            ->get();
    }
}
