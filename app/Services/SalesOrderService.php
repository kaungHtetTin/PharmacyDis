<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\DeliveryVoucher;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderFocItem;
use App\Models\SalesOrderItem;
use App\Models\SalesRepresentative;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesOrderService
{
    public function __construct(
        private ProductUnitConversionService $conversionService,
        private CreditControlService $creditControlService,
        private CustomerBalanceService $customerBalanceService,
        private InvoiceService $invoiceService,
        private NumberGeneratorService $numberGeneratorService,
        private StockMovementService $stockMovementService,
    ) {
    }

    public function createForSalesRepresentative(User $user, array $data): SalesOrder
    {
        $salesRepresentative = $user->salesRepresentative()->with('company')->first();

        if (! $salesRepresentative) {
            throw ValidationException::withMessages([
                'user' => 'This user is not linked to a sales representative profile.',
            ]);
        }

        $data['company_id'] = $salesRepresentative->company_id;
        $data['sales_representative_id'] = $salesRepresentative->id;

        $order = $this->create($data, $user);
        $this->invoiceService->generateFromOrder($order, $user, allowSubmitted: true);

        return $order->fresh([
            'company',
            'customer',
            'salesRepresentative.user',
            'items.product',
            'items.unit',
            'items.focUnit',
            'focItems.product',
            'focItems.focRule',
            'invoices',
        ]);
    }

    public function create(array $data, ?User $actor = null): SalesOrder
    {
        return DB::transaction(function () use ($data, $actor) {
            $company = Company::findOrFail($data['company_id']);
            $customer = Customer::findOrFail($data['customer_id']);
            $salesRepresentative = isset($data['sales_representative_id'])
                ? SalesRepresentative::find($data['sales_representative_id'])
                : null;

            if ($salesRepresentative && $salesRepresentative->company_id !== $company->id) {
                throw ValidationException::withMessages([
                    'sales_representative_id' => 'The selected sales representative is not assigned to this company.',
                ]);
            }

            $this->creditControlService->assertOrderAllowed($customer, $company);

            $order = SalesOrder::create([
                'order_no' => $this->numberGeneratorService->next(SalesOrder::class, 'order_no', 'SO'),
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'sales_representative_id' => $salesRepresentative?->id,
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'requested_delivery_date' => $data['requested_delivery_date'] ?? null,
                'payment_due_date' => $data['payment_due_date'] ?? now()->addDays((int) config('billing.invoice_due_days', 30))->toDateString(),
                'status' => $data['status'] ?? 'submitted',
                'tax_amount' => round(max(0, (float) ($data['tax_amount'] ?? 0)), 2),
                'note' => $data['note'] ?? null,
                'created_by' => $actor?->id,
            ]);

            $totals = $this->createItems($order, $company, $data['items'] ?? []);

            $order->update($totals);

            return $order->fresh(['company', 'customer', 'salesRepresentative.user', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule']);
        });
    }

    public function updateBeforeDelivery(SalesOrder $order, array $data, ?User $actor = null): SalesOrder
    {
        return DB::transaction(function () use ($order, $data, $actor) {
            $order = SalesOrder::query()
                ->with(['items', 'focItems', 'invoices.allocations'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            $this->assertOrderCanChange($order);
            $this->assertInvoicesCanChange($order);

            $originalCustomerId = (int) $order->customer_id;
            $originalCompanyId = (int) $order->company_id;
            $wasReserved = in_array($order->status, ['approved', 'invoiced'], true);
            $warehouseId = $data['warehouse_id'] ?? $this->reservationWarehouseId($order);

            if ($wasReserved) {
                $this->stockMovementService->releaseReserved(SalesOrder::class, (int) $order->id, $actor?->id);
            }

            $company = Company::findOrFail($data['company_id']);
            $customer = Customer::findOrFail($data['customer_id']);
            $salesRepresentative = isset($data['sales_representative_id'])
                ? SalesRepresentative::find($data['sales_representative_id'])
                : null;

            if ($salesRepresentative && $salesRepresentative->company_id !== $company->id) {
                throw ValidationException::withMessages([
                    'sales_representative_id' => 'The selected sales representative is not assigned to this company.',
                ]);
            }

            $this->creditControlService->assertOrderAllowed($customer, $company);

            $order->focItems()->delete();
            $order->items()->delete();
            $order->update([
                'company_id' => $company->id,
                'customer_id' => $customer->id,
                'sales_representative_id' => $salesRepresentative?->id,
                'order_date' => $data['order_date'] ?? $order->order_date?->toDateString() ?? now()->toDateString(),
                'requested_delivery_date' => $data['requested_delivery_date'] ?? null,
                'payment_due_date' => $data['payment_due_date'] ?? $order->payment_due_date?->toDateString() ?? now()->addDays((int) config('billing.invoice_due_days', 30))->toDateString(),
                'tax_amount' => round(max(0, (float) ($data['tax_amount'] ?? 0)), 2),
                'note' => $data['note'] ?? null,
            ]);

            $totals = $this->createItems($order, $company, $data['items'] ?? []);
            $order->update($totals);
            $order->load('items');

            if ($wasReserved) {
                foreach ($order->items as $item) {
                    $quantityToReserve = (int) $item->base_unit_quantity + (int) $item->foc_base_unit_quantity;

                    if ($quantityToReserve <= 0) {
                        continue;
                    }

                    $this->stockMovementService->reserve(
                        (int) $order->company_id,
                        (int) $item->product_id,
                        $quantityToReserve,
                        SalesOrder::class,
                        (int) $order->id,
                        $actor?->id,
                        $warehouseId
                    );
                }
            }

            $this->syncInvoices($order, $actor);

            $this->customerBalanceService->refresh($originalCustomerId, $originalCompanyId);
            if ($originalCustomerId !== (int) $order->customer_id || $originalCompanyId !== (int) $order->company_id) {
                $this->customerBalanceService->refresh((int) $order->customer_id, (int) $order->company_id);
            }

            return $order->fresh(['company', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
        });
    }

    public function deleteBeforeDelivery(SalesOrder $order, ?User $actor = null): void
    {
        DB::transaction(function () use ($order, $actor) {
            $order = SalesOrder::query()
                ->with(['invoices.allocations'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            $this->assertOrderCanChange($order);
            $this->assertInvoicesCanChange($order);

            if (in_array($order->status, ['approved', 'invoiced'], true)) {
                $this->stockMovementService->releaseReserved(SalesOrder::class, (int) $order->id, $actor?->id);
            }

            $this->voidInvoices($order);

            $customerId = (int) $order->customer_id;
            $companyId = (int) $order->company_id;

            $order->update(['status' => 'cancelled']);
            $order->delete();

            $this->customerBalanceService->refresh($customerId, $companyId);
        });
    }

    public function createAndApprove(array $data, ?User $actor = null): SalesOrder
    {
        return DB::transaction(function () use ($data, $actor) {
            unset($data['status'], $data['auto_approve']);

            $order = $this->create($data, $actor);

            return $this->approve($order, $actor, $data['warehouse_id'] ?? null);
        });
    }

    public function approve(SalesOrder $order, ?User $actor = null, ?int $warehouseId = null): SalesOrder
    {
        return DB::transaction(function () use ($order, $actor, $warehouseId) {
            $order = SalesOrder::query()
                ->with('items')
                ->lockForUpdate()
                ->findOrFail($order->id);

            if (in_array($order->status, ['approved', 'invoiced'], true)) {
                return $order->fresh(['company', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
            }

            if ($order->status !== 'submitted') {
                throw ValidationException::withMessages([
                    'status' => 'Only submitted orders can be approved.',
                ]);
            }

            foreach ($order->items as $item) {
                $quantityToReserve = (int) $item->base_unit_quantity + (int) $item->foc_base_unit_quantity;

                if ($quantityToReserve <= 0) {
                    continue;
                }

                $this->stockMovementService->reserve(
                    (int) $order->company_id,
                    (int) $item->product_id,
                    $quantityToReserve,
                    SalesOrder::class,
                    (int) $order->id,
                    $actor?->id,
                    $warehouseId
                );
            }

            $order->update([
                'status' => 'approved',
                'approved_by' => $actor?->id,
                'approved_at' => now(),
            ]);

            return $order->fresh(['company', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
        });
    }

    public function deliver(SalesOrder $order, ?User $actor = null): SalesOrder
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = SalesOrder::query()
                ->with(['items', 'invoices'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($order->status === 'delivered') {
                return $order->fresh(['company', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
            }

            if (! in_array($order->status, ['approved', 'invoiced'], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Only approved or invoiced orders can be delivered.',
                ]);
            }

            foreach ($order->items as $item) {
                $quantityToDeliver = (int) $item->base_unit_quantity + (int) $item->foc_base_unit_quantity;

                if ($quantityToDeliver <= 0) {
                    continue;
                }

                $this->stockMovementService->sellReserved(
                    (int) $order->company_id,
                    (int) $item->product_id,
                    $quantityToDeliver,
                    SalesOrder::class,
                    (int) $order->id,
                    $actor?->id
                );
            }

            $invoice = $order->invoices->sortByDesc('id')->first();

            DeliveryVoucher::updateOrCreate(
                ['sales_order_id' => $order->id],
                [
                    'voucher_no' => $this->numberGeneratorService->next(DeliveryVoucher::class, 'voucher_no', 'DV'),
                    'invoice_id' => $invoice?->id,
                    'delivery_date' => now()->toDateString(),
                    'status' => 'delivered',
                    'delivered_by' => $actor?->name,
                    'created_by' => $actor?->id,
                ]
            );

            $order->update(['status' => 'delivered']);

            return $order->fresh(['company', 'items.product', 'items.unit', 'items.focUnit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
        });
    }

    private function assertOrderCanChange(SalesOrder $order): void
    {
        if ($order->status === 'delivered') {
            throw ValidationException::withMessages([
                'status' => 'Delivered orders cannot be edited or deleted.',
            ]);
        }
    }

    private function assertInvoicesCanChange(SalesOrder $order): void
    {
        $hasPaidInvoice = $order->invoices->contains(fn ($invoice) => $invoice->allocations->isNotEmpty() || (float) $invoice->paid_amount > 0);

        if ($hasPaidInvoice) {
            throw ValidationException::withMessages([
                'invoice' => 'This order already has invoice payments and cannot be edited or deleted.',
            ]);
        }
    }

    private function reservationWarehouseId(SalesOrder $order): ?int
    {
        $warehouseIds = StockMovement::query()
            ->where('reference_type', SalesOrder::class)
            ->where('reference_id', $order->id)
            ->where('movement_type', 'reserve')
            ->whereNotNull('warehouse_id')
            ->distinct()
            ->pluck('warehouse_id');

        return $warehouseIds->count() === 1 ? (int) $warehouseIds->first() : null;
    }

    private function syncInvoices(SalesOrder $order, ?User $actor = null): void
    {
        $order->load('items');

        foreach ($order->invoices()->with('items')->get() as $invoice) {
            $invoice->items()->delete();
            $taxAmount = (float) ($invoice->tax_amount ?? 0);
            $invoiceTotal = round((float) $order->total_amount + $taxAmount, 2);

            $invoice->update([
                'company_id' => $order->company_id,
                'customer_id' => $order->customer_id,
                'sales_representative_id' => $order->sales_representative_id,
                'subtotal_amount' => $order->subtotal_amount,
                'discount_amount' => $order->discount_amount,
                'foc_value_amount' => $order->foc_value_amount,
                'total_amount' => $invoiceTotal,
                'balance_amount' => max(0, $invoiceTotal - (float) $invoice->paid_amount),
                'due_date' => $order->payment_due_date?->toDateString() ?? $invoice->due_date?->toDateString() ?? now()->addDays((int) config('billing.invoice_due_days', 30))->toDateString(),
                'status' => (float) $invoice->paid_amount > 0 ? 'partial' : 'issued',
                'created_by' => $invoice->created_by ?? $actor?->id,
            ]);

            foreach ($order->items as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'sales_order_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'unit_id' => $item->unit_id,
                    'quantity' => $item->quantity,
                    'conversion_factor_to_base' => $item->conversion_factor_to_base,
                    'base_unit_quantity' => $item->base_unit_quantity,
                    'unit_price' => $item->unit_price,
                    'discount_percentage' => $item->discount_percentage,
                    'discount_amount' => $item->discount_amount,
                    'foc_base_unit_quantity' => $item->foc_base_unit_quantity,
                    'line_total' => $item->line_total,
                ]);
            }
        }
    }

    private function voidInvoices(SalesOrder $order): void
    {
        foreach ($order->invoices as $invoice) {
            $invoice->update([
                'status' => 'void',
                'paid_amount' => 0,
                'balance_amount' => 0,
            ]);
        }
    }

    private function createItems(SalesOrder $order, Company $company, array $items): array
    {
        if (count($items) === 0) {
            throw ValidationException::withMessages([
                'items' => 'At least one product line is required.',
            ]);
        }

        $subtotal = 0;
        $discountTotal = 0;
        $focValueTotal = 0;
        $requiredStockByProduct = [];

        foreach ($items as $index => $itemData) {
            $product = Product::where('company_id', $company->id)->findOrFail($itemData['product_id']);
            $productUnit = $this->conversionService->resolve($product, (int) $itemData['unit_id']);
            $quantity = (int) $itemData['quantity'];
            $baseUnitQuantity = $quantity * $productUnit->conversion_factor_to_base;
            $unitPrice = (float) $productUnit->selling_price;
            $gross = $quantity * $unitPrice;
            $discountPercentage = isset($itemData['discount_percentage'])
                ? (float) $itemData['discount_percentage']
                : (float) $product->default_discount_percentage;
            $discountAmount = round($gross * ($discountPercentage / 100), 2);
            $lineTotal = $gross - $discountAmount;
            $focQuantity = (int) ($itemData['foc_quantity'] ?? 0);
            $focUnitId = $itemData['foc_unit_id'] ?? $productUnit->unit_id;
            $focProductUnit = $focQuantity > 0
                ? $this->conversionService->resolve($product, (int) $focUnitId)
                : null;
            $focBaseUnitQuantity = $focProductUnit
                ? $focQuantity * (int) $focProductUnit->conversion_factor_to_base
                : 0;
            $requiredBaseUnitQuantity = $baseUnitQuantity + $focBaseUnitQuantity;

            if ($quantity <= 0) {
                throw ValidationException::withMessages([
                    "items.$index.quantity" => 'Quantity must be greater than zero.',
                ]);
            }

            $productKey = (int) $product->id;
            $requiredStockByProduct[$productKey] = ($requiredStockByProduct[$productKey] ?? 0) + $requiredBaseUnitQuantity;
            $availableBaseUnitQuantity = (int) StockBatch::query()
                ->where('company_id', $company->id)
                ->where('product_id', $product->id)
                ->sum('available_base_quantity');

            if ($requiredStockByProduct[$productKey] > $availableBaseUnitQuantity) {
                throw ValidationException::withMessages([
                    "items.$index.quantity" => "{$product->name} has only {$availableBaseUnitQuantity} available base units. Ordered and FOC quantity requires {$requiredStockByProduct[$productKey]}.",
                ]);
            }

            $orderItem = SalesOrderItem::create([
                'sales_order_id' => $order->id,
                'product_id' => $product->id,
                'unit_id' => $productUnit->unit_id,
                'foc_unit_id' => $focProductUnit?->unit_id,
                'quantity' => $quantity,
                'foc_quantity' => $focQuantity,
                'conversion_factor_to_base' => $productUnit->conversion_factor_to_base,
                'foc_conversion_factor_to_base' => $focProductUnit?->conversion_factor_to_base ?? 1,
                'base_unit_quantity' => $baseUnitQuantity,
                'foc_base_unit_quantity' => $focBaseUnitQuantity,
                'unit_price' => $unitPrice,
                'discount_percentage' => $discountPercentage,
                'discount_amount' => $discountAmount,
                'line_total' => $lineTotal,
                'commission_rate_percentage' => $product->commission_rate_percentage,
                'commission_amount' => round($lineTotal * ((float) $product->commission_rate_percentage / 100), 2),
            ]);

            if ($focBaseUnitQuantity > 0) {
                $basePrice = (float) ($product->productUnits()
                    ->where('is_base_unit', true)
                    ->value('selling_price') ?: ($productUnit->conversion_factor_to_base > 0 ? $unitPrice / $productUnit->conversion_factor_to_base : 0));
                $focEstimatedValue = $focBaseUnitQuantity * $basePrice;

                SalesOrderFocItem::create([
                    'sales_order_id' => $order->id,
                    'sales_order_item_id' => $orderItem->id,
                    'foc_rule_id' => null,
                    'product_id' => $product->id,
                    'reward_base_unit_quantity' => $focBaseUnitQuantity,
                    'estimated_value_amount' => $focEstimatedValue,
                ]);

                $focValueTotal += $focEstimatedValue;
            }

            $subtotal += $gross;
            $discountTotal += $discountAmount;
        }

        return [
            'subtotal_amount' => $subtotal,
            'discount_amount' => $discountTotal,
            'foc_value_amount' => $focValueTotal,
            'total_amount' => $subtotal - $discountTotal + (float) $order->tax_amount,
        ];
    }
}
