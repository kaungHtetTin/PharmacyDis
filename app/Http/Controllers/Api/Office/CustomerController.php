<?php

namespace App\Http\Controllers\Api\Office;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Models\Customer;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        return Customer::query()
            ->with(['creditStatuses.company'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->boolean('action_only'), fn ($query) => $query->whereHas('creditStatuses', fn ($creditQuery) => $creditQuery->whereIn('credit_status', ['warning', 'blocked'])))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(function ($searchQuery) use ($request) {
                    $searchQuery->where('name', 'like', "%{$request->search}%")
                        ->orWhere('code', 'like', "%{$request->search}%")
                        ->orWhere('owner_name', 'like', "%{$request->search}%")
                        ->orWhere('phone', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(StoreCustomerRequest $request)
    {
        $data = $this->payload($request);
        $data['code'] = ($data['code'] ?? '') ?: $this->makeCode($data['name']);

        $customer = Customer::create($data);

        return response()->json($customer->fresh(['creditStatuses.company']), 201);
    }

    public function detail(Customer $customer)
    {
        $customer->load(['creditStatuses.company']);

        $orders = $customer->salesOrders()
            ->with(['company:id,name', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule', 'salesRepresentative.user:id,name'])
            ->latest('order_date')
            ->limit(25)
            ->get();
        $invoices = $customer->invoices()
            ->with(['company:id,name', 'salesOrder:id,order_no', 'allocations.payment'])
            ->latest('invoice_date')
            ->limit(25)
            ->get();
        $payments = $customer->payments()
            ->with(['company:id,name', 'allocations.invoice'])
            ->latest('payment_date')
            ->limit(25)
            ->get();
        $monthlySales = Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereYear('invoice_date', now()->year)
            ->whereMonth('invoice_date', now()->month)
            ->sum('total_amount');
        $invoiceTotal = (float) $invoices->sum('total_amount');
        $paidTotal = (float) $invoices->sum('paid_amount');
        $paymentRate = $invoiceTotal > 0 ? round(($paidTotal / $invoiceTotal) * 100) : 0;

        return response()->json([
            'customer' => $customer,
            'credit_statuses' => $customer->creditStatuses,
            'orders' => $orders,
            'invoices' => $invoices,
            'payments' => $payments,
            'summary' => [
                'monthly_sales' => (float) $monthlySales,
                'monthly_order_count' => $orders
                    ->where('order_date', '>=', now()->startOfMonth())
                    ->count(),
                'outstanding' => (float) $invoices->sum('balance_amount'),
                'invoice_count' => $invoices->count(),
                'unpaid_invoice_count' => $invoices->where('balance_amount', '>', 0)->count(),
                'payment_rate' => $paymentRate,
            ],
        ]);
    }

    public function update(StoreCustomerRequest $request, Customer $customer)
    {
        $data = $this->payload($request);
        $data['code'] = ($data['code'] ?? '') ?: $customer->code;

        $customer->update($data);

        return $customer->fresh(['creditStatuses.company']);
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->noContent();
    }

    private function payload(StoreCustomerRequest $request): array
    {
        $data = $request->validated();
        $data['status'] = $data['status'] ?? 'active';

        return $data;
    }

    private function makeCode(string $name): string
    {
        $base = Str::upper(Str::slug($name, ''));
        $base = $base !== '' ? Str::limit($base, 20, '') : 'PHARMACY';
        $code = $base;
        $suffix = 1;

        while (Customer::withTrashed()->where('code', $code)->exists()) {
            $code = "{$base}{$suffix}";
            $suffix++;
        }

        return $code;
    }
}
