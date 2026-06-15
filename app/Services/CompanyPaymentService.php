<?php

namespace App\Services;

use App\Models\CompanyPayable;
use App\Models\CompanyPayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompanyPaymentService
{
    public function __construct(private NumberGeneratorService $numberGeneratorService)
    {
    }

    public function record(array $data, ?User $actor = null): CompanyPayment|array
    {
        return DB::transaction(function () use ($data, $actor) {
            if (! empty($data['pay_all'])) {
                return $this->settleCompanyPayables($data, $actor);
            }

            $payable = null;

            if (! empty($data['company_payable_id'])) {
                $payable = CompanyPayable::query()->lockForUpdate()->findOrFail($data['company_payable_id']);

                if ((int) $payable->company_id !== (int) $data['company_id']) {
                    throw ValidationException::withMessages([
                        'company_payable_id' => 'Selected payable does not belong to this company.',
                    ]);
                }

                if ((float) $data['amount'] > (float) $payable->balance_amount) {
                    throw ValidationException::withMessages([
                        'amount' => 'Payment amount cannot exceed the selected payable balance.',
                    ]);
                }
            }

            $payment = CompanyPayment::create([
                'payment_no' => $this->numberGeneratorService->next(CompanyPayment::class, 'payment_no', 'CPAY'),
                'company_id' => $data['company_id'],
                'company_payable_id' => $payable?->id,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference_no' => $data['reference_no'] ?? null,
                'note' => $data['note'] ?? null,
                'created_by' => $actor?->id,
            ]);

            if ($payable) {
                $paidAmount = (float) $payable->paid_amount + (float) $data['amount'];
                $balanceAmount = max(0, (float) $payable->amount - $paidAmount);

                $payable->update([
                    'paid_amount' => min((float) $payable->amount, $paidAmount),
                    'balance_amount' => $balanceAmount,
                    'status' => $balanceAmount <= 0 ? 'paid' : 'partial',
                ]);

                $this->syncStockReceiptPayment($payable->fresh());
            }

            return $payment->fresh(['company', 'payable.stockReceipt']);
        });
    }

    private function settleCompanyPayables(array $data, ?User $actor = null): array
    {
        $payables = CompanyPayable::query()
            ->lockForUpdate()
            ->where('company_id', $data['company_id'])
            ->where('status', '!=', 'paid')
            ->where('balance_amount', '>', 0)
            ->orderByRaw('due_date is null')
            ->orderBy('due_date')
            ->orderBy('id')
            ->get();

        if ($payables->isEmpty()) {
            throw ValidationException::withMessages([
                'company_id' => 'This company has no open payables to settle.',
            ]);
        }

        $payments = [];
        $settledAmount = 0;

        foreach ($payables as $payable) {
            $amount = (float) $payable->balance_amount;
            $settledAmount += $amount;

            $payments[] = CompanyPayment::create([
                'payment_no' => $this->numberGeneratorService->next(CompanyPayment::class, 'payment_no', 'CPAY'),
                'company_id' => $payable->company_id,
                'company_payable_id' => $payable->id,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount' => $amount,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference_no' => $data['reference_no'] ?? null,
                'note' => $data['note'] ?? 'Settled company open payables.',
                'created_by' => $actor?->id,
            ])->fresh(['company', 'payable.stockReceipt']);

            $payable->update([
                'paid_amount' => (float) $payable->amount,
                'balance_amount' => 0,
                'status' => 'paid',
            ]);

            $this->syncStockReceiptPayment($payable->fresh());
        }

        return [
            'settled_count' => count($payments),
            'settled_amount' => $settledAmount,
            'payments' => $payments,
        ];
    }

    private function syncStockReceiptPayment(CompanyPayable $payable): void
    {
        $receipt = $payable->stockReceipt;

        if (! $receipt) {
            return;
        }

        $paymentStatus = (float) $payable->balance_amount <= 0
            ? 'paid'
            : ((float) $payable->paid_amount > 0 ? 'partial' : 'unpaid');

        $receipt->update([
            'paid_amount' => $payable->paid_amount,
            'due_amount' => $payable->balance_amount,
            'payment_status' => $paymentStatus,
        ]);
    }
}
