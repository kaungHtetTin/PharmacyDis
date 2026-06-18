<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\DeliveryVoucher;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderFocItem;
use App\Models\SalesOrderItem;
use App\Models\SalesRepresentative;
use App\Models\StockBatch;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesOrderService
{
    public function __construct(
        private ProductUnitConversionService $conversionService,
        private CreditControlService $creditControlService,
        private FocCalculationService $focCalculationService,
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
                'status' => $data['status'] ?? 'submitted',
                'note' => $data['note'] ?? null,
                'created_by' => $actor?->id,
            ]);

            $totals = $this->createItems($order, $company, $data['items'] ?? []);

            $order->update($totals);

            return $order->fresh(['company', 'customer', 'salesRepresentative.user', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule']);
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
                return $order->fresh(['company', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
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

            return $order->fresh(['company', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
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
                return $order->fresh(['company', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
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

            return $order->fresh(['company', 'items.product', 'items.unit', 'focItems.product', 'focItems.focRule', 'customer', 'salesRepresentative.user', 'invoices']);
        });
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
            $foc = $this->focCalculationService->calculate($company, $product, $baseUnitQuantity, $lineTotal);
            $focBaseUnitQuantity = (int) ($foc['reward_base_unit_quantity'] ?? 0);
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
                'quantity' => $quantity,
                'conversion_factor_to_base' => $productUnit->conversion_factor_to_base,
                'base_unit_quantity' => $baseUnitQuantity,
                'unit_price' => $unitPrice,
                'discount_percentage' => $discountPercentage,
                'discount_amount' => $discountAmount,
                'line_total' => $lineTotal,
                'commission_rate_percentage' => $product->commission_rate_percentage,
                'commission_amount' => round($lineTotal * ((float) $product->commission_rate_percentage / 100), 2),
            ]);

            if ($foc) {
                $orderItem->update(['foc_base_unit_quantity' => $focBaseUnitQuantity]);
                foreach ($foc['allocations'] as $allocation) {
                    SalesOrderFocItem::create([
                        'sales_order_id' => $order->id,
                        'sales_order_item_id' => $orderItem->id,
                        'foc_rule_id' => $allocation['foc_rule_id'],
                        'product_id' => $product->id,
                        'reward_base_unit_quantity' => $allocation['reward_base_unit_quantity'],
                        'estimated_value_amount' => $allocation['estimated_value_amount'],
                    ]);
                }
                $focValueTotal += $foc['estimated_value_amount'];
            }

            $subtotal += $gross;
            $discountTotal += $discountAmount;
        }

        return [
            'subtotal_amount' => $subtotal,
            'discount_amount' => $discountTotal,
            'foc_value_amount' => $focValueTotal,
            'total_amount' => $subtotal - $discountTotal,
        ];
    }
}
