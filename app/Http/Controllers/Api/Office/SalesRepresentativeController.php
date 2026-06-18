<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSalesRepresentativeRequest;
use App\Models\Invoice;
use App\Models\Role;
use App\Models\SalesRepresentative;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SalesRepresentativeController extends Controller
{
    public function index(Request $request)
    {
        return SalesRepresentative::query()
            ->with(['company', 'user:id,name,email,phone,status'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;

                $query->where(function ($nested) use ($search) {
                    $nested->where('phone', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('company_id'), fn ($query) => $query->where('company_id', $request->company_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->orderBy('employee_code')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreSalesRepresentativeRequest $request)
    {
        $data = $request->validated();
        $data['employee_code'] = $data['employee_code'] ?: $this->makeEmployeeCode();
        $data['status'] = $data['status'] ?? 'active';

        $salesRepresentative = DB::transaction(function () use ($data) {
            $user = User::create([
                'role_id' => $this->salesRoleId(),
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'user_type' => 'sales',
                'status' => $data['status'],
                'password' => Hash::make($data['password'] ?? 'password'),
            ]);

            return SalesRepresentative::create([
                'user_id' => $user->id,
                'company_id' => $data['company_id'],
                'employee_code' => $data['employee_code'],
                'phone' => $data['phone'] ?? null,
                'region' => $data['region'] ?? null,
                'joined_at' => $data['joined_at'] ?? null,
                'status' => $data['status'],
            ]);
        });

        return response()->json($salesRepresentative->load(['company', 'user:id,name,email,phone,status']), 201);
    }

    public function detail(Request $request, SalesRepresentative $salesRepresentative)
    {
        $salesRepresentative->load(['company', 'user:id,name,email,phone,status']);

        $orders = $salesRepresentative->salesOrders()
            ->with(['company:id,name', 'customer:id,name', 'items.product'])
            ->latest('order_date')
            ->paginate($request->integer('sales_per_page', 10), ['*'], 'sales_page');

        $monthlyOrders = $salesRepresentative->salesOrders()
            ->whereYear('order_date', now()->year)
            ->whereMonth('order_date', now()->month);

        $monthlySales = (float) Invoice::query()
            ->where('sales_representative_id', $salesRepresentative->id)
            ->whereYear('invoice_date', now()->year)
            ->whereMonth('invoice_date', now()->month)
            ->sum('total_amount');

        $lastMonthSales = (float) Invoice::query()
            ->where('sales_representative_id', $salesRepresentative->id)
            ->whereYear('invoice_date', now()->copy()->subMonth()->year)
            ->whereMonth('invoice_date', now()->copy()->subMonth()->month)
            ->sum('total_amount');

        $yearlySales = (float) Invoice::query()
            ->where('sales_representative_id', $salesRepresentative->id)
            ->whereYear('invoice_date', now()->year)
            ->sum('total_amount');

        return response()->json([
            'profile' => [
                'id' => $salesRepresentative->id,
                'code' => $salesRepresentative->employee_code,
                'name' => $salesRepresentative->user?->name,
                'phone' => $salesRepresentative->phone ?: $salesRepresentative->user?->phone,
                'region' => $salesRepresentative->region,
                'status' => $this->titleCase($salesRepresentative->status),
                'companies' => $salesRepresentative->company?->name,
                'productAccess' => $this->productAccessLabel($salesRepresentative),
            ],
            'metrics' => [
                [
                    'label' => 'Monthly sales',
                    'value' => number_format($monthlySales),
                    'note' => $this->salesChangeNote($monthlySales, $lastMonthSales),
                ],
                [
                    'label' => 'Yearly sales',
                    'value' => number_format($yearlySales),
                    'note' => now()->year . ' invoice total',
                ],
                [
                    'label' => 'Orders',
                    'value' => (string) (clone $monthlyOrders)->count(),
                    'note' => (clone $monthlyOrders)->whereDate('order_date', today())->count() . ' submitted today',
                ],
            ],
            'performanceChart' => $this->weeklyPerformance($salesRepresentative),
            'monthlySalesChart' => $this->monthlySalesChart($salesRepresentative),
            'yearlySalesChart' => $this->yearlySalesChart($salesRepresentative),
            'salesHistoryRows' => $this->salesHistoryRows($orders->getCollection()),
            'salesHistoryPagination' => [
                'currentPage' => $orders->currentPage(),
                'from' => $orders->firstItem() ?? 0,
                'lastPage' => $orders->lastPage(),
                'perPage' => $orders->perPage(),
                'to' => $orders->lastItem() ?? 0,
                'total' => $orders->total(),
            ],
        ]);
    }

    public function update(StoreSalesRepresentativeRequest $request, SalesRepresentative $salesRepresentative)
    {
        $data = $request->validated();
        $data['employee_code'] = $data['employee_code'] ?: $salesRepresentative->employee_code;
        $data['status'] = $data['status'] ?? $salesRepresentative->status;

        DB::transaction(function () use ($data, $salesRepresentative) {
            $userData = [
                'role_id' => $this->salesRoleId(),
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'user_type' => 'sales',
                'status' => $data['status'],
            ];

            if (!empty($data['password'])) {
                $userData['password'] = Hash::make($data['password']);
            }

            $salesRepresentative->user()->update($userData);
            $salesRepresentative->update([
                'company_id' => $data['company_id'],
                'employee_code' => $data['employee_code'],
                'phone' => $data['phone'] ?? null,
                'region' => $data['region'] ?? null,
                'joined_at' => $data['joined_at'] ?? null,
                'status' => $data['status'],
            ]);
        });

        return $salesRepresentative->fresh()->load(['company', 'user:id,name,email,phone,status']);
    }

    public function destroy(SalesRepresentative $salesRepresentative)
    {
        DB::transaction(function () use ($salesRepresentative) {
            $salesRepresentative->delete();
            $salesRepresentative->user?->update(['status' => 'inactive']);
        });

        return response()->noContent();
    }

    private function makeEmployeeCode(): string
    {
        $base = 'SR-' . now()->format('ymd');
        $code = $base . '-001';
        $suffix = 1;

        while (SalesRepresentative::withTrashed()->where('employee_code', $code)->exists()) {
            $suffix++;
            $code = $base . '-' . str_pad((string) $suffix, 3, '0', STR_PAD_LEFT);
        }

        return $code;
    }

    private function salesRoleId(): ?int
    {
        return Role::where('name', 'sales_representative')->value('id');
    }

    private function productAccessLabel(SalesRepresentative $salesRepresentative): string
    {
        $count = $salesRepresentative->company
            ? $salesRepresentative->company->products()->where('status', 'active')->count()
            : 0;

        return "{$count} assigned products";
    }

    private function salesChangeNote(float $monthlySales, float $lastMonthSales): string
    {
        if ($lastMonthSales <= 0) {
            return $monthlySales > 0 ? 'New sales this month' : 'No sales last month';
        }

        $change = round((($monthlySales - $lastMonthSales) / $lastMonthSales) * 100);
        $prefix = $change >= 0 ? '+' : '';

        return "{$prefix}{$change}% from last month";
    }

    private function weeklyPerformance(SalesRepresentative $salesRepresentative): array
    {
        $weeks = [
            ['Week 1', now()->copy()->startOfMonth(), now()->copy()->startOfMonth()->addDays(6)],
            ['Week 2', now()->copy()->startOfMonth()->addDays(7), now()->copy()->startOfMonth()->addDays(13)],
            ['Week 3', now()->copy()->startOfMonth()->addDays(14), now()->copy()->startOfMonth()->addDays(20)],
            ['Week 4', now()->copy()->startOfMonth()->addDays(21), now()->copy()->endOfMonth()],
        ];

        $rows = collect($weeks)->map(function ($week) use ($salesRepresentative) {
            [$label, $start, $end] = $week;
            $value = (float) Invoice::query()
                ->where('sales_representative_id', $salesRepresentative->id)
                ->whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])
                ->sum('total_amount');

            return compact('label', 'value');
        });
        $max = max(1, (float) $rows->max('value'));

        return $rows->map(fn ($row) => [
            'label' => $row['label'],
            'value' => number_format($row['value']),
            'percent' => (int) round($row['value'] / $max * 100),
        ])->values()->all();
    }

    private function monthlySalesChart(SalesRepresentative $salesRepresentative): array
    {
        $rows = collect(range(1, 12))->map(function ($month) use ($salesRepresentative) {
            $date = now()->copy()->startOfYear()->addMonths($month - 1);
            $value = (float) Invoice::query()
                ->where('sales_representative_id', $salesRepresentative->id)
                ->whereYear('invoice_date', $date->year)
                ->whereMonth('invoice_date', $date->month)
                ->sum('total_amount');

            return [
                'label' => $date->format('M'),
                'value' => $value,
                'note' => $date->format('Y-m'),
            ];
        });

        return $this->formatVerticalChartRows($rows);
    }

    private function yearlySalesChart(SalesRepresentative $salesRepresentative): array
    {
        $currentYear = (int) now()->year;
        $rows = collect(range($currentYear - 4, $currentYear))->map(function ($year) use ($salesRepresentative) {
            $value = (float) Invoice::query()
                ->where('sales_representative_id', $salesRepresentative->id)
                ->whereYear('invoice_date', $year)
                ->sum('total_amount');

            return [
                'label' => (string) $year,
                'value' => $value,
                'note' => "{$year} sales",
            ];
        });

        return $this->formatVerticalChartRows($rows);
    }

    private function formatVerticalChartRows($rows): array
    {
        $max = max(1, (float) $rows->max('value'));

        return $rows->map(fn ($row) => [
            'label' => $row['label'],
            'value' => number_format((float) $row['value']),
            'rawValue' => (float) $row['value'],
            'percent' => (int) round(((float) $row['value'] / $max) * 100),
            'note' => $row['note'] ?? '',
        ])->values()->all();
    }

    private function salesHistoryRows($orders): array
    {
        return $orders->map(fn ($order) => [
            'id' => $order->id,
            'order' => $order->order_no,
            'pharmacy' => $order->customer?->name ?: "Customer #{$order->customer_id}",
            'company' => $order->company?->name ?: "Company #{$order->company_id}",
            'date' => optional($order->order_date)->toDateString(),
            'amount' => number_format((float) $order->total_amount),
            'status' => $this->titleCase($order->status),
        ])
            ->values()
            ->all();
    }

    private function titleCase(?string $value): string
    {
        return str($value ?: '')->replace('_', ' ')->title()->toString();
    }
}
