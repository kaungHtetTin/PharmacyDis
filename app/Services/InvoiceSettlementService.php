<?php

namespace App\Services;

use App\Models\CustomerCredit;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InvoiceSettlementService
{
    public function __construct(private NumberGeneratorService $numberGeneratorService)
    {
    }

    /**
     * Rebuild the invoice settlement cache from immutable source transactions.
     * Callers that change payments or returns should already hold an invoice row lock.
     */
    public function recalculate(Invoice $invoice, ?User $actor = null): Invoice
    {
        $invoice->loadMissing('salesOrder');

        $returnCredit = $this->money($invoice->salesReturns()
            ->where('status', 'posted')
            ->sum('total_amount'));
        $allocatedPayments = $this->money(DB::table('payment_allocations')
            ->join('payments', 'payments.id', '=', 'payment_allocations.payment_id')
            ->whereNull('payments.deleted_at')
            ->where('payment_allocations.invoice_id', $invoice->id)
            ->sum('payment_allocations.allocated_amount'));
        $originalTotal = $this->resolveOriginalTotal($invoice, $returnCredit);
        $cashBack = min($this->money($invoice->cash_back_amount), $originalTotal);
        $netCollectible = $this->money(max(0, $originalTotal - $cashBack - $returnCredit));
        $balance = $this->money(max(0, $netCollectible - $allocatedPayments));
        $customerCredit = $this->money(max(0, $allocatedPayments - $netCollectible));
        $settlementStatus = $this->settlementStatus(
            $invoice->status,
            $originalTotal,
            $returnCredit,
            $netCollectible,
            $allocatedPayments,
            $balance
        );

        $invoice->forceFill([
            'original_total_amount' => $originalTotal,
            'return_credit_amount' => $returnCredit,
            'net_collectible_amount' => $netCollectible,
            // total_amount is the issued amount during the compatibility period.
            'total_amount' => $originalTotal,
            'paid_amount' => $allocatedPayments,
            'balance_amount' => $invoice->status === 'void' ? 0 : $balance,
            'settlement_status' => $invoice->status === 'void' ? 'void' : $settlementStatus,
            'settlement_calculated_at' => now(),
        ]);

        if ($invoice->status !== 'void') {
            $invoice->status = match ($settlementStatus) {
                'paid', 'overpaid' => 'paid',
                'partial' => 'partial',
                default => 'issued',
            };
        }

        $invoice->save();
        $this->syncCustomerCredit($invoice, $customerCredit, $actor);

        return $invoice->fresh();
    }

    public function preview(Invoice $invoice): array
    {
        $invoice->loadMissing('salesOrder');
        $returnCredit = $this->money($invoice->salesReturns()->where('status', 'posted')->sum('total_amount'));
        $paid = $this->money(DB::table('payment_allocations')
            ->join('payments', 'payments.id', '=', 'payment_allocations.payment_id')
            ->whereNull('payments.deleted_at')
            ->where('payment_allocations.invoice_id', $invoice->id)
            ->sum('payment_allocations.allocated_amount'));
        $original = $this->resolveOriginalTotal($invoice, $returnCredit);
        $cashBack = min($this->money($invoice->cash_back_amount), $original);
        $net = $this->money(max(0, $original - $cashBack - $returnCredit));
        $balance = $this->money(max(0, $net - $paid));
        $settlementStatus = $invoice->status === 'void'
            ? 'void'
            : $this->settlementStatus($invoice->status, $original, $returnCredit, $net, $paid, $balance);

        return [
            'original_total_amount' => $original,
            'cash_back_amount' => $cashBack,
            'return_credit_amount' => $returnCredit,
            'net_collectible_amount' => $net,
            'paid_amount' => $paid,
            'balance_amount' => $invoice->status === 'void' ? 0 : $balance,
            'customer_credit_amount' => $this->money(max(0, $paid - $net)),
            'settlement_status' => $settlementStatus,
            'legacy_status' => $invoice->status === 'void'
                ? 'void'
                : $this->legacyStatus($settlementStatus),
        ];
    }

    private function resolveOriginalTotal(Invoice $invoice, float $returnCredit): float
    {
        $storedOriginal = $this->money($invoice->original_total_amount);

        if ($storedOriginal > 0 || ((float) $invoice->total_amount === 0.0 && ! $invoice->sales_order_id && $returnCredit === 0.0)) {
            return $storedOriginal;
        }

        if ($invoice->salesOrder) {
            return $this->money($invoice->salesOrder->total_amount);
        }

        return $this->money((float) $invoice->total_amount + (float) $invoice->cash_back_amount + $returnCredit);
    }

    private function settlementStatus(
        string $documentStatus,
        float $original,
        float $returnCredit,
        float $net,
        float $paid,
        float $balance
    ): string {
        if ($documentStatus === 'void') {
            return 'void';
        }

        if ($net <= 0 && $returnCredit > 0 && $paid <= 0) {
            return 'credited';
        }

        if ($paid > $net) {
            return 'overpaid';
        }

        if ($net > 0 && $balance <= 0 && $paid > 0) {
            return 'paid';
        }

        if ($paid > 0) {
            return 'partial';
        }

        // A zero-value draft/issued document is not a payment.
        return $original > 0 ? 'unpaid' : 'unpaid';
    }

    private function legacyStatus(string $settlementStatus): string
    {
        return match ($settlementStatus) {
            'paid', 'overpaid' => 'paid',
            'partial' => 'partial',
            default => 'issued',
        };
    }

    private function syncCustomerCredit(Invoice $invoice, float $amount, ?User $actor): void
    {
        $key = "invoice-overpayment:{$invoice->id}";
        $existing = CustomerCredit::where('idempotency_key', $key)->first();

        if ($amount <= 0) {
            if ($existing && $existing->status === 'available') {
                $existing->update(['amount' => 0, 'available_amount' => 0, 'status' => 'void']);
            }

            return;
        }

        CustomerCredit::updateOrCreate(
            ['idempotency_key' => $key],
            [
                'credit_no' => $existing?->credit_no
                    ?? $this->numberGeneratorService->next(CustomerCredit::class, 'credit_no', 'CCR'),
                'company_id' => $invoice->company_id,
                'customer_id' => $invoice->customer_id,
                'invoice_id' => $invoice->id,
                'amount' => $amount,
                'available_amount' => $amount,
                'status' => 'available',
                'source_type' => Invoice::class,
                'source_id' => $invoice->id,
                'credit_date' => now()->toDateString(),
                'note' => 'Automatically recognized after invoice credits exceeded the collectible amount.',
                'created_by' => $existing?->created_by ?? $actor?->id,
            ]
        );
    }

    private function money($value): float
    {
        return round((float) $value, 2);
    }
}
