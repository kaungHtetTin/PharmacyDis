# Financial Integrity Phase 0 Decision Record

## Approval and Scope

- Decision date: 2026-08-22.
- Status: Approved implementation baseline.
- Authority assumption: the request to complete the financial-integrity update is treated as product-owner authorization for these policies. If the requester is not the finance decision owner, finance must countersign before production repair is applied.
- Applies to: invoices, customer payments, sales returns, FOC rewards, commission, supplier payments, receivables, payables, dashboards, reports, print/export, and inventory valuation.
- Production data rule: no production repair runs until the dry-run output and backup are approved.

## Accounting Decisions

### Invoice and settlement

```text
original_invoice_total = subtotal - discount + tax
return_credit          = sum(posted sales return credits)
net_collectible        = max(0, original_invoice_total - cash_back - return_credit)
allocated_payments     = sum(active payment allocations)
open_balance           = max(0, net_collectible - allocated_payments)
customer_credit        = max(0, allocated_payments - net_collectible)
```

- Issued invoice headers and lines are immutable.
- Returns and cash back are adjustment events; neither rewrites the issued sale.
- A return is not a payment.
- Tax is included exactly once in the original invoice. A taxable return carries its proportional tax credit.
- Money is rounded half-up to two decimal places at line/event boundaries.

### Cash back

- Cash back is a contra-revenue sales deduction, not a cash expense.
- New cash back uses its approval timestamp as the report date.
- Historical cash back without an approval timestamp uses invoice date and is labeled as a legacy assumption.
- Cash back cannot exceed original invoice amount less posted return credits.

### Overpayment and refund

- A payment that exceeds net collectible after a later return creates an explicit customer-credit liability.
- Invoice balance remains zero; it never becomes a negative receivable.
- A cash refund is a separate future transaction against customer credit and requires finance authorization. It must never be represented by deleting or reducing the original payment.

### FOC returns

- Full return of a paid line removes the full linked FOC entitlement.
- Rule-based partial returns recalculate entitlement from the original rule snapshot; any excess reward requires disposition.
- Manual FOC on a partial return requires an explicit finance/warehouse decision rather than an inferred fractional quantity.
- Allowed dispositions are `returned`, `charged`, and `waived`.
- `returned` increases inventory only after physical receipt confirmation.
- `charged` and `waived` require a reason and approver. Charged FOC requires a separate charge/adjustment document.
- Historical FOC is created as `review_required`; it does not alter stock until confirmed.

### Commission

- Commission is earned on net merchandise sales after line discount, excluding FOC.
- Posted returns reverse the original line commission proportionally.
- Payment timing does not determine commission earning.
- Cash-back allocation to commission is deferred until payroll owners require that extension; current commission remains line-based and the report discloses this basis.
- Historical payroll is not silently rewritten; repair produces adjustment records for approval.

## Status Decisions

Document lifecycle:

- `draft`: editable before issue.
- `issued`: immutable financial document.
- `void`: excluded from active financial measures.

Settlement lifecycle:

- `unpaid`: positive net collectible with no allocated payment.
- `partial`: positive payment and positive open balance.
- `paid`: positive net collectible fully covered by actual allocated payment.
- `credited`: net collectible is zero because of credits and no payment exists.
- `overpaid`: allocated payments exceed net collectible; customer credit is available.
- `void`: document is void and has no collectible balance.

The legacy `invoices.status` field remains during compatibility rollout. `settlement_status` is authoritative for payment state.

## Reporting Decisions

- Gross sales: non-void original invoice total by invoice date.
- Returns: posted return credit by return date.
- Cash back: approved amount by approval date; legacy fallback is invoice date.
- Net sales: gross sales minus returns and cash back occurring in the selected period.
- Collections: customer payment amount by payment date.
- Collection performance: customer payments in the period divided by the collectible amount available, defined as opening per-invoice receivable plus period gross sales and FOC charges less period returns and cash back; displayed at no more than 100%, with excess represented as customer credit.
- Receivable as of: calculate each invoice independently from invoice, return, cash-back, charge, and allocated-payment events through the selected end date; clamp each invoice at zero before summing. Never offset one customer's credit against another customer's receivable.
- Customer credits: present available overpayments separately as liabilities; do not net them into the gross receivable asset.
- Supplier outcome: linked `company_payments` by payment date.
- Payable as of: calculate each payable independently from its original amount and linked supplier payments through the selected end date; clamp each payable at zero before summing.
- Stock holding: current available base quantity multiplied by resolved base-unit cost. Until a historical cost/quantity ledger is available, label this explicitly as a current snapshot and do not imply that the report date filter applies.
- Company/pharmacy performance: show gross invoice sales, returns, cash back, and net sales separately; rank by net sales so the table reconciles to the headline event-date formula.
- Net cash margin: net cash divided by cash income. Do not label this measure as profit margin because it excludes COGS and accrual expenses.
- Missing inventory cost is an exception count/value, never a silent zero-valued success.
- Void and soft-deleted documents are excluded consistently unless a user explicitly requests a void audit.

## Role and Approval Matrix

| Action | Office operator | Inventory manager | Finance manager | Admin / Super admin |
| --- | --- | --- | --- | --- |
| View invoice/order | Yes | Yes | Yes | Yes |
| Record customer payment | No | No | Yes | Yes |
| Initiate return | Yes | Yes | Yes | Yes |
| Confirm returned stock condition | No | Yes | No | Yes |
| Post financial return credit | No | No | Yes | Yes |
| Confirm FOC returned | No | Yes | No | Yes |
| Charge/waive FOC | No | No | Propose | Approve |
| Record supplier payment | No | No | Yes | Yes |
| Void payment/return/invoice | No | No | No | Yes |
| View financial reports | No | Scoped inventory only | Yes | Yes |
| Run production repair | No | No | Sign-off | Execute/authorize |

Implementation may continue using existing broad permissions for read compatibility, but all new high-impact endpoints must enforce the finance/admin boundary server-side.

## Production Control Baseline

Source: restored server backup `medi_mart_live_backup_20260822`.

| Control | Baseline |
| --- | ---: |
| Active invoices | 1,021 |
| Active invoice stored total | 308,876,622 |
| Active invoice paid amount | 143,879,936 |
| Active invoice balance | 164,996,686 |
| Customer payment allocations | 143,879,936 |
| Posted returns | 37 / 21,678,400 |
| False-paid, zero-payment, fully returned invoices | 35 |
| Partially returned invoices | 2 |
| Active void invoices | 23 / 11,009,880 |
| Company payments | 80,210,423.50 |
| Missing supplier cash transaction | 7,520 |
| Available null-cost batches | 143 / 15,310 base units |
| Historical FOC requiring decision | 71 base units / estimated 743,800 |

Approved August 2026 event-date controls:

| Measure | Amount |
| --- | ---: |
| Non-void invoices | 427 |
| Gross sales by invoice date | 119,742,656 |
| Cash back by approved/legacy invoice date | 437,500 |
| Posted returns by return date | 5,612,120 |
| Net sales | 113,693,036 |
| Customer payments by payment date | 68,286,892 |
| Active void invoice difference excluded | 3,566,800 |

The previously quoted 121,288,456 is not an approved gross-sales control. It combines mutated August invoice totals with all August return events, including credits against earlier-month invoices.

## Posting Freeze and Maintenance Window

- Planned window: 06:00-07:00 Myanmar Time on the approved deployment day.
- Notify office, warehouse, sales, and finance users at least 24 hours before the window.
- Read-only screens may remain available if they are clearly marked as maintenance data.
- Block order edits/approval/delivery, invoice generation/cash-back changes, payments, returns, refunds, receiving, stock adjustment, and stock transfer during repair.
- Permit only the deployment operator to run versioned CLI repair commands.
- At window start: verify backup, record control totals, and confirm zero active posting requests.
- At 45 minutes: if repair and audit have not completed, keep posting closed and choose an approved extension or restore; do not reopen on partial reconciliation.
- Reopen only after database migration, invoice repair, supplier-payment repair, stock-cost backfill, full audit, and smoke tests pass.

## Phase 0 Exit Gate

- [x] Accounting formulas approved.
- [x] Cash-back treatment approved.
- [x] Overpayment/customer-credit policy approved.
- [x] FOC disposition policy approved.
- [x] Commission basis approved.
- [x] Document and settlement statuses approved.
- [x] Role/approval matrix approved.
- [x] Production control totals captured.
- [x] Maintenance window and freeze scope defined.

Phase 0 is complete. Production application remains contingent on the later dry-run and finance review gates.
