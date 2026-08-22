# Financial Integrity Deployment Runbook

## Scope and Safety

This runbook deploys the additive financial-integrity schema, application code, and versioned data repairs. It does not authorize a production run by itself. A verified backup, posting freeze, and finance approval of all dry-run artifacts are mandatory.

Never point repair commands at production until the database name, backup timestamp, repair version, and finance approver are recorded in the change ticket.

## Pre-deployment Gate

1. Notify office, warehouse, sales, and finance users at least 24 hours before the 06:00-07:00 Myanmar Time maintenance window.
2. Put the application into maintenance mode and confirm no payment, return, receiving, order, delivery, transfer, or stock-adjustment requests remain active.
3. Take a new database backup and restore it to an isolated database.
4. Record invoice, payment, allocation, return, payable, supplier-payment, and available-stock control totals.
5. Deploy the code to the restored copy and run:

```bash
php artisan migrate --force
php artisan finance:repair-invoices --dry-run --output=storage/app/financial-repair-dry-run.json
php artisan finance:repair-supplier-payments --dry-run --output=storage/app/supplier-payment-repair-dry-run.json
php artisan stock:backfill-batch-costs --dry-run --output=storage/app/stock-cost-repair-dry-run.json
```

6. Finance signs the invoice, supplier-payment, FOC, and commission proposals. Warehouse signs any FOC marked physically returned.
7. Stop if any invoice is quarantined, a payable is overpaid, or an inventory cost remains unresolved.

## Production Apply

Choose one immutable repair version, such as the approved release/change number. Run invoice ranges in ascending order when a smaller transaction window is required.

```bash
php artisan migrate --force
php artisan finance:repair-invoices --apply --repair-version=<approved-version> --chunk=100 --output=storage/app/financial-repair-apply.json
php artisan finance:repair-supplier-payments --apply --repair-version=<approved-version> --chunk=200 --output=storage/app/supplier-payment-repair-apply.json
php artisan stock:backfill-batch-costs --apply --chunk=200 --output=storage/app/stock-cost-repair-apply.json
```

The invoice repair deliberately creates historical FOC rows as `pending_review` and historical commission reversals as `pending_approval`. It does not guess physical stock or payroll decisions.

Use **Finance -> Returns -> Review FOC and commission** to complete those decisions:

- `returned`: inventory manager/admin confirms physical receipt; stock increases at resolved historical cost;
- `charged`: admin approval creates a separate customer charge adjustment;
- `waived`: admin approval records the reason and value without changing stock;
- commission proposal: finance approves or rejects with an audit note.

## Reconciliation and Reopening

Run:

```bash
php artisan finance:audit --output=storage/app/financial-audit-final.json
```

Do not reopen posting unless `healthy` is `true`. All cache, line, allocation, supplier-payment, inventory-cost, FOC, and commission exception counts must be zero.

Smoke-test receivables/payment, invoice detail/print, full and partial returns with FOC, receiving with initial payment and retry, finance reports including cross-month returns, and stock valuation warnings. After sign-off, leave maintenance mode and record the final audit artifact and production backup identifier in the change ticket.

## Rollback and Recovery

- If reconciliation fails before reopening, stop and preserve all JSON outputs and logs.
- Restore the verified pre-deployment backup; do not delete or manually reverse individual financial rows.
- Additive schema may remain during a code rollback, but repair data must not be partly exposed to old reporting code.
- `migrate:rollback` is only for an environment where the repair was not applied. It cannot serve as a financial transaction rollback.

## Monitoring Checklist

For the first seven business days and at the next month-end close:

- [ ] Run `finance:audit` daily and retain the JSON result.
- [ ] Confirm no false-paid zero-payment invoices.
- [ ] Confirm invoice/order amount and line mismatches remain zero.
- [ ] Confirm payment allocations equal invoice paid caches.
- [ ] Confirm supplier payable paid totals equal linked company payments.
- [ ] Confirm no available stock batch has missing cost.
- [ ] Review new customer credits and FOC charge adjustments.
- [ ] Review return/commission approvals and voids.
- [ ] Compare dashboard, finance report, invoice report, print, and export totals for the same filters.
- [ ] Keep compatibility fields until the observation period closes without unexplained differences.
