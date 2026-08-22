# Financial Integrity Restored-Backup Verification

## Verification Context

- Verification date: 2026-08-22.
- Source: `u806199789_medi_mart.sql`.
- Isolated database: `medi_mart_financial_verify_20260822_2`.
- Production/restored reference database `medi_mart_live_backup_20260822` was not modified.
- Verification repair version: `2026-08-22-verify-v3`.

## Dry-run Findings

| Control | Result |
| --- | ---: |
| Invoice rows requiring initialization/reconciliation | 1,044 |
| Quarantined invoices | 0 |
| Legacy false-paid invoices converted to credited | 35 |
| Invoices with reconstructed lines | 60 (37 returns plus 23 void/cancelled legacy documents) |
| Historical FOC reviews | 6 records / 71 base units |
| Historical commission proposals | 45 lines / 37 returns / 1,122,099.60 |
| Missing supplier payments | 1 / 7,520 |
| Resolvable null-cost batches | 342 |
| Unresolved costs | 0 |

## Apply and Idempotency Result

All three apply commands exited successfully on the isolated restored copy. A second invoice and supplier-payment repair using the same version proposed and wrote zero rows. A post-apply dry run using a different version also proposed zero invoice, FOC, or commission rows, confirming state-based as well as repair-key idempotency.

## Incident Record Result

`INV-20260820-0023`, linked to `SO-20260820-0024`, now reconciles as:

| Field | Verified value |
| --- | ---: |
| Subtotal/original/issued total | 107,500 |
| Return credit | 107,500 |
| Net collectible | 0 |
| Payment allocated | 0 |
| Open balance | 0 |
| Document status | `issued` |
| Settlement status | `credited` |

Its two invoice lines were restored to the original quantities and values. The FOC reward remains a separate historical review decision; it is not treated as payment and did not erase the invoice.

## Post-apply Reconciliation

| Audit control | Result |
| --- | ---: |
| Invoice settlement cache mismatches | 0 |
| False-paid zero-payment invoices | 0 |
| Invoice/payment allocation mismatches | 0 |
| Invoice/order total mismatches | 0 |
| Invoice/order line mismatches | 0 |
| Excess return quantity controls | 0 |
| Excess FOC disposition controls | 0 |
| Supplier-payment difference | 0 |
| Available batches with missing cost | 0 |
| Verified stock holding value | 130,002,400.43 |

Approved August 2026 event-date measures reproduce exactly:

| Measure | Verified amount |
| --- | ---: |
| Gross sales | 119,742,656 |
| Returns | 5,612,120 |
| Cash back | 437,500 |
| Net sales | 113,693,036 |
| Customer payments | 68,286,892 |

The repaired supplier transaction is one linked company payment for 7,520 against `SR-20260711-0001`.

## Application Verification

- Laravel test suite: 43 passed.
- Production frontend build: passed.
- Added regression coverage for full and partial tiered-FOC returns, explicit FOC disposition, charged FOC adjustments, commission approval, customer credits, supplier-payment retry safety, and stock-cost valuation.
- Manual role-based browser acceptance remains part of the production deployment smoke test; it was not recorded as complete in this local verification.

The follow-up reporting controls also verify that receivables and payables are clamped per document before aggregation, customer credit remains a separate liability, collection performance uses opening receivable plus period activity, stock value is labeled as a current snapshot, and company/pharmacy rankings reconcile gross sales through returns and cash back to net sales. On the isolated restored copy, the corrected August collection-performance denominator is 233,283,578 and the resulting collection rate is 29.3%; receivable as of remains 164,996,686 because that backup has no available customer-credit offset. Event-based payable as of at 2026-08-31 is 338,653,122.50.

## Required Human Approval Gate

The audit correctly exits non-zero until these decisions are completed:

- 6 historical FOC records covering 71 base units are `pending_review`;
- 45 commission adjustments covering all 37 historical returns are `pending_approval`.

These are intentional safety gates because the backup cannot prove whether free goods were physically returned or whether historical payroll adjustments were approved. Production repair must not be declared healthy until authorized users complete them in the Returns review UI and `finance:audit` returns `healthy: true`.

## Verification Artifacts

- `storage/app/financial-repair-dry-run-final.json`
- `storage/app/supplier-payment-repair-dry-run-final.json`
- `storage/app/stock-cost-repair-dry-run-final.json`
- `storage/app/financial-repair-apply-final.json`
- `storage/app/supplier-payment-repair-apply-final.json`
- `storage/app/stock-cost-repair-apply-final.json`
- `storage/app/financial-audit-preapproval-final.json`
- `storage/app/financial-repair-postcheck-final.json`
