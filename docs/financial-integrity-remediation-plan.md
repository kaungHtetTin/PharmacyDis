# Financial Integrity Remediation Plan

## Document Status

- Status: Application implementation and restored-backup verification complete. Production deployment and human FOC/commission approvals remain gated.
- Prepared from: read-only analysis of the restored production backup dated 2026-08-22.
- Local analysis database: `medi_mart_live_backup_20260822`.
- Primary incident: invoice `INV-20260820-0023` / sales order `SO-20260820-0024`.
- Phase 0 accounting definitions: approved implementation baseline; see `docs/financial-integrity-phase-0-decisions.md`.
- Production gate: finance/operations sign-off, a verified backup, maintenance window, and completion of historical FOC/commission decisions are still required.

---

## 1. Objective

Restore reliable financial records and reports by separating the original sales invoice from later financial events such as returns, cash back, and payments.

The completed solution must:

- Preserve the original invoice and invoice-line values after a return.
- Represent a return as a separate credit event, not as a payment and not as a destructive edit to the invoice.
- Distinguish document status from settlement status.
- Handle FOC items explicitly when paid goods are returned.
- Produce consistent gross sales, returns, net sales, collections, receivables, payables, and inventory valuation.
- Repair affected historical records safely and repeatably.

## 2. Confirmed Findings and Baseline

### 2.1 Primary incident

The database history for `SO-20260820-0024` shows:

1. The order and invoice were created with a valid amount of **107,500**.
2. The order contained two paid lines and one FOC reward worth **25,000**.
3. A posted full sales return, `SRN-20260820-0002`, returned the two paid lines for **107,500**.
4. The return operation reduced the invoice-line quantities and invoice header amounts to zero.
5. Because the resulting calculation evaluated `paid amount 0 >= invoice total 0`, the invoice was marked `paid` even though it has no payment allocation.

The receivable Paid action is therefore correlated with the visible symptom, but it is not the operation that erased this invoice's original total. `SalesReturnService` performed the destructive reduction; `PaymentAllocationService` only recalculates paid amount, balance, and status.

### 2.2 Affected financial data

The restored backup contains the following repair baseline:

| Finding | Baseline |
| --- | ---: |
| Posted returns | 37 invoices / 21,678,400 |
| Fully returned invoices reduced to zero and marked paid without a payment | 35 |
| Partially returned invoices whose stored total is already net of return | 2 |
| Returned orders that contain FOC rewards | 6 |
| FOC quantity retained without an explicit return/charge/waiver decision | 71 base units |
| Estimated value of those FOC units | 743,800 |
| Commission retained on fully returned orders | 1,111,659.60 |
| Active void invoices still included by some reports | 23 / 11,009,880 |
| Supplier payment missing from `company_payments` | 1 / 7,520 |
| Available stock batches with null cost | 143 / 15,310 base units |
| Available units currently valued as zero because exact receipt matching fails | 1,014 base units in 15 batches |
| Estimated inventory-value understatement | 1,331,186.84 |

The current invoice resynchronization path also adds `invoice.tax_amount` to `sales_orders.total_amount`, even though the order total already includes tax, and it deletes/recreates invoice lines after issue. No active invoice in this backup has a non-zero tax amount, so the tax defect has not changed the measured production totals yet; it is a latent double-tax risk that must be covered by the refactor and tests.

### 2.3 August 2026 reporting example

| Measure | Amount |
| --- | ---: |
| Current stored invoice sales | 115,676,336 |
| Sales returns displayed separately | 5,612,120 |
| Reconstructed gross invoice sales by invoice date | 119,742,656 |
| Cash back by approval/legacy invoice date | 437,500 |
| Event-date net sales | 113,693,036 |
| Customer payments | 68,286,892 |
| Collection rate using mutated invoice sales | 59.0% |
| Collection rate using reconstructed gross sales | 57.0% |

The current invoice total is already reduced by returns, while reports also display returns separately. Any consumer calculating `invoice sales - returns` therefore subtracts returns twice. The earlier mixed-basis value 121,288,456 is not an approved gross control because it combines August invoice rows with return events belonging to invoices from other months.

There are also six cross-month returns totaling **2,477,100**. Mutating the source invoice moves their effect into the original invoice month instead of the return month, so historical reports can change after they were previously closed.

### 2.4 Existing controls that currently reconcile

These controls should remain green throughout the change:

- Sales-order headers agree with sales-order lines.
- Invoice paid amounts agree with payment allocations.
- Invoice balance arithmetic agrees with the current stored model.
- Payment headers agree with payment allocations.
- Customer balance rows and company-specific credit outstanding amounts reconcile.
- Sales-return headers agree with return lines.
- Stock-receipt headers agree with receipt lines.
- Payables agree with their stock receipts and payable balance formulas.
- No duplicate invoice, customer-payment, or company-payment numbers were found.
- No orphan financial references, invalid return/payment dates, or payments allocated to void invoices were found.
- Cash back reconciles for all 11 affected invoices: current invoice total + cash back + posted returns = sales-order total.

---

## 3. Approved Accounting Model Required Before Coding

The following definitions are the recommended source of truth:

```text
original_invoice_total = subtotal - discount + tax
return_credit          = sum(posted sales return amounts)
net_collectible        = max(0, original_invoice_total - cash_back - return_credit)
allocated_payments     = sum(active payment allocations)
open_balance           = max(0, net_collectible - allocated_payments)
customer_credit        = max(0, allocated_payments - net_collectible)
```

Rules:

- The original invoice header and lines are immutable after issue, except through a controlled void/correction workflow with an audit record.
- A sales return is a credit event dated on `sales_returns.return_date`.
- A return never counts as a payment.
- `paid` means that actual allocated payments settled a positive collectible amount.
- A fully returned invoice with no payment is `credited` or `returned`, not `paid`.
- Cash back, return credit, payment, refund, and customer credit are separate concepts.
- Gross sales use issued, non-void original invoice amounts.
- Net sales equal gross sales minus posted returns/credits and approved cash back under an explicitly documented date policy.
- Report filters must consistently exclude void and soft-deleted documents.
- Historical/as-of reports use event dates and must not derive old-period results from today's mutable balance.

The approved Phase 0 record resolves these decisions:

1. Whether cash back is reported as a sales deduction or an expense.
2. Whether an overpayment after a return creates customer credit, a refund liability, or both through separate transactions.
3. Whether FOC must be returned proportionally, charged, or may be waived with approval.
4. Whether sales commission is earned on gross sales, net sales, collected sales, or another approved basis.

---

## 4. Target Database Design

Use additive Laravel migrations first. Do not drop or reinterpret existing columns during the first deployment.

### 4.1 Invoice settlement fields

Add to `invoices`:

| Column | Suggested type | Purpose |
| --- | --- | --- |
| `original_total_amount` | `decimal(15,2)` default 0 | Immutable issued invoice total |
| `return_credit_amount` | `decimal(15,2)` default 0 | Cached total of posted returns |
| `net_collectible_amount` | `decimal(15,2)` default 0 | Original total less approved credits/cash back |
| `settlement_status` | `varchar(40)` default `unpaid` | `unpaid`, `partial`, `paid`, `credited`, `overpaid` |
| `settlement_calculated_at` | nullable timestamp | Reconciliation freshness/audit |

Keep `status` temporarily for document lifecycle compatibility. The target lifecycle values should be `draft`, `issued`, and `void`; payment state belongs only in `settlement_status`.

Add indexes for common filters, including invoice date + document status, due date + settlement status, customer + settlement status, and company + invoice date.

`total_amount` should continue to expose the original total during compatibility rollout. `balance_amount` should expose the current open balance. All names and API semantics must be documented before removing fallback behavior.

### 4.2 Return credit integrity

Keep `sales_returns` and `sales_return_items` as the financial credit document and its immutable lines. Add only what is required for traceability:

- A unique idempotency/reference key for safely retrying return posting.
- Posted/void timestamps and actor IDs if not already represented by audit history.
- An optional credit-note number if finance requires a separately numbered accounting document.
- A reason code in addition to free text.

Never delete or rewrite an issued invoice line when posting a return.

### 4.3 FOC return disposition

Create `sales_return_foc_items` to record what happened to rewards associated with returned paid goods:

| Column | Purpose |
| --- | --- |
| `sales_return_id` | Parent return |
| `sales_order_foc_item_id` | Original FOC reward |
| `product_id` | Reward product |
| `base_unit_quantity` | Quantity covered by this decision |
| `estimated_value_amount` | Auditable reward value |
| `disposition` | `returned`, `charged`, or `waived` |
| `reason` | Required for charge/waiver exceptions |
| `approved_by`, `approved_at` | Required authorization trail |

Add a database/application constraint that cumulative FOC disposition cannot exceed the original reward quantity.

### 4.4 Commission reversal

Record return-related commission reversal by line, either with a dedicated `sales_return_commission_adjustments` table or immutable fields on `sales_return_items`. A dedicated table is preferred if commission may later be adjusted or approved independently.

Required values include original order item, original commission amount, reversal amount, calculation basis, status, actor, and timestamp. Net commission must be computed from original commission minus posted reversals.

### 4.5 Supplier-payment provenance

Add explicit source linkage to `company_payments`:

- `source_type` and `source_id`, or a nullable `stock_receipt_id`.
- A unique idempotency key preventing the same receiving payment from being created twice.
- An index on company + payment date and on the source reference.

Creating a stock receipt with `paid_amount > 0` must create a corresponding company-payment transaction and link it to the payable inside the same database transaction.

### 4.6 Inventory cost completeness

- Backfill null `stock_batches.base_unit_cost` with the existing historical cost resolver.
- Retain `cost_source` so estimated/historical costs are distinguishable from exact receipt costs.
- After backfill and verification, reject new available stock with missing cost at the service layer.
- Consider a later `NOT NULL` constraint only when all stock-producing workflows guarantee a cost.
- Never silently value available stock at zero; expose unresolved valuation as an exception.

### 4.7 Audit and repair log

Create a compact `financial_data_repairs` table or write to the existing auditable activity mechanism with:

- repair key and version;
- target table and record ID;
- before/after JSON values;
- reason and source backup/reference;
- executed by and timestamp.

The repair key must be unique so rerunning a migration or command does not apply the repair twice.

---

## 5. Server-Side Implementation Plan

### 5.1 Central settlement calculation

Introduce one `InvoiceSettlementService` (or equivalent domain service) used by:

- invoice creation and synchronization;
- customer payment allocation/reversal;
- sales return post/void;
- cash-back changes;
- receivables queries;
- customer balance and credit-status refresh;
- repair and audit commands.

It must calculate values from source transactions, not accept totals supplied by the browser. Use decimal-safe arithmetic and round money once at the documented boundary.

### 5.2 Refactor sales-return posting

Change `SalesReturnService` so it:

1. Locks the invoice, returnable invoice lines, stock batches, and affected customer balance using `lockForUpdate()` inside one database transaction.
2. Validates that cumulative posted returns do not exceed original invoice quantities or amounts.
3. Creates immutable return lines and inventory movements.
4. Records FOC disposition and commission reversal.
5. Recalculates settlement from invoice + returns + cash back + allocations.
6. Refreshes the customer/company receivable and credit status.
7. Emits an audit event.

Remove the current behavior that subtracts return quantities from `invoice_items` and return values from the invoice's original subtotal/discount/total.

### 5.3 Harden payment allocation

Payment allocation must:

- refuse allocations above open collectible balance unless an approved customer-credit workflow is selected;
- refuse a Paid action when no positive payment is recorded;
- never infer `paid` merely because both paid and total are zero;
- recalculate through the central settlement service;
- remain idempotent under request retry;
- lock affected payment, invoice, and customer balance rows.

The existing receivables button should call a real payment/allocation operation, not directly set a status.

### 5.4 Invoice synchronization

When an invoice already exists, synchronization must not silently return it without verifying its relationship to the approved order. Define explicit behavior:

- Before issue: invoice may be regenerated from the current order.
- After issue and before downstream activity: corrections use an authorized amend/reissue workflow.
- After payments, returns, or delivery: original invoice lines are immutable; adjustment documents are required.

### 5.5 Financial reporting query layer

Create shared financial query methods so dashboard, finance overview, customer pages, invoice report, exports, and print views use identical definitions.

Required measures:

- Gross issued invoice sales.
- Posted sales returns/credit notes.
- Approved cash back.
- Net sales.
- Customer payments collected.
- Open receivables.
- Customer credits/refund liabilities.
- Gross commission, return reversals, and net commission.
- Supplier payments from `company_payments`.
- Stock holding value and unresolved-cost amount/count.

All entry points must apply the same void/deleted rules. Replace current queries that include void invoices in the dashboard, customer monthly sales, and printable invoice report.

For historical reports, use the date of each event. Do not compute a past receivable or payable snapshot by filtering document dates and then reading today's balance. If true historical aging is required, calculate from invoice, credit, and payment events through the selected as-of date.

### 5.6 Reconciliation commands

Add commands with dry-run as the default behavior:

```text
php artisan finance:audit
php artisan finance:repair-invoices --dry-run
php artisan finance:repair-invoices --apply --repair-version=<version>
php artisan finance:repair-supplier-payments --dry-run
php artisan stock:backfill-batch-costs --dry-run
```

Each command must print counts and monetary totals, export a machine-readable result, return a non-zero exit code on failed invariants, and support record ranges/chunks for controlled production execution.

---

## 6. UI/UX Plan

### 6.1 Receivables list

- Rename **Paid** to **Record payment** or **Settle balance**.
- Display separate columns for Original invoice, Credits/returns, Paid, and Balance.
- Use distinct badges: `Unpaid`, `Partial`, `Paid`, `Credited/Returned`, `Overpaid`, and `Void`.
- Do not style a fully returned, unpaid invoice as paid.
- Add quick filters for overdue, partial, credited, overpaid, and inconsistent records.
- Show a non-blocking integrity warning when calculated values do not match cached values.

The payment modal must show:

- original invoice amount;
- cash back;
- posted return credits;
- payments already allocated;
- balance before this payment;
- payment being recorded;
- balance or customer credit after payment.

Disable confirmation for zero/negative payment, excess allocation without an approved credit path, or a credited/void invoice.

### 6.2 Invoice detail and print

Replace the single ambiguous amount card with a settlement summary:

| Label | Meaning |
| --- | --- |
| Original invoice | Amount issued to the customer |
| Cash back/discount after issue | Approved reduction, if applicable |
| Return credits | Posted sales returns |
| Net collectible | Amount eligible for payment |
| Payments received | Allocated customer payments |
| Open balance | Amount still receivable |

Add a transaction timeline linking the order, invoice issue, deliveries, returns/credit notes, payments, and refunds/credits. Display the FOC reward and its return disposition. Invoice printing must preserve original lines and show return/credit references separately rather than printing a zero-value replacement invoice.

### 6.3 Sales-return workflow

- Show original quantity, previously returned quantity, currently returnable quantity, unit price, and estimated credit.
- Display related FOC rewards as soon as return quantity is entered.
- For a full or qualifying proportional return, default the FOC disposition to return and require an authorized reason to charge or waive it.
- Show commission impact to authorized roles.
- Require a final confirmation summarizing inventory, customer credit, FOC, and commission effects.
- After posting, show a printable return/credit receipt with links to the source invoice.
- Provide clear empty, loading, validation, conflict, and retry states.

### 6.4 Reports and dashboards

- Use the same metric labels and formulas everywhere.
- Present Gross sales, Returns, Cash back, Net sales, Payments, and Open receivables as separate values.
- Add formula tooltips and a reconciliation row.
- Exclude void invoices consistently and make the exclusion visible in filter help.
- Show selected date basis (`invoice date`, `return date`, `payment date`, or `as of`).
- Flag unresolved inventory cost instead of presenting it as zero.
- Exports must use the same query and labels as the screen.

### 6.5 Receiving and supplier payment

- When receiving records an initial paid amount, show that a supplier payment transaction will be created.
- After save, link the receipt, payable, and company payment.
- Payables and payment detail must show the source receipt and payment provenance.
- Retry must not create duplicate payments.

### 6.6 Accessibility and operational safety

- Do not rely on badge color alone; always show text and icons consistently.
- Format money with the configured currency and use tabular numerals.
- Confirm high-impact return, void, waiver, and repair actions.
- Require reason text for exceptions and show the actor/time in the timeline.
- Preserve entered form data after recoverable validation or network errors.

---

## 7. Historical Data Repair Plan

Data repair must be implemented as an explicit, versioned Artisan command—not hidden inside a schema migration. Schema migrations add structure; the repair command transforms financial records under controlled operating procedures.

### 7.1 Pre-repair controls

1. Put finance posting into a short maintenance window or block only payment/return/receiving writes.
2. Take and verify a new production database backup.
3. Record table counts and financial control totals.
4. Run the repair against a restored copy first.
5. Export every proposed change with record ID, document number, before values, after values, and reason.
6. Obtain finance sign-off on the dry-run output.

### 7.2 Invoice reconstruction

For each active invoice:

1. Reconstruct original invoice-line quantity and value by adding grouped posted return lines back to the currently reduced invoice lines.
2. Prefer the linked approved sales-order lines as an independent control.
3. Set `original_total_amount` from the controlled original lines/order.
4. Set `return_credit_amount` to posted return totals.
5. Set `net_collectible_amount = max(0, original total - cash back - posted returns)`.
6. Set `paid_amount` from active payment allocations.
7. Set `balance_amount = max(0, net collectible - paid)`.
8. Set settlement state using the approved rules below.

The backup currently supports a strong reconstruction invariant for every affected invoice:

```text
current invoice total + cash back + posted return total = linked sales-order total
```

Any record that fails this invariant during the production dry run must be quarantined for manual review rather than guessed.

### 7.3 Settlement-state repair

Apply in this order:

| Condition | Settlement state |
| --- | --- |
| Document is void | Not applicable / void |
| Net collectible is 0, return credit is positive, paid is 0 | `credited` |
| Net collectible is 0 and paid is positive | `overpaid` or refund/credit pending |
| Balance is 0 and paid is positive | `paid` |
| Balance is positive and paid is positive | `partial` |
| Balance is positive and paid is 0 | `unpaid` |

This should convert the 35 false-paid/no-payment invoices to `credited`, while retaining genuine payment allocations.

### 7.4 FOC historical repair

Create disposition rows for the six fully returned orders with FOC rewards. Do not assume that stock was physically returned.

- Mark each record `review_required` in the dry-run export.
- Finance/warehouse must choose returned, charged, or waived for all 71 base units.
- Only a confirmed physical return may increase available inventory.
- Charged disposition creates an approved charge/invoice adjustment.
- Waived disposition records approver, reason, and financial value without changing stock.

### 7.5 Commission historical repair

Calculate proposed reversals for all 37 returned orders. Fully returned paid lines should normally reverse their full associated commission; partial returns reverse proportionally using the original line basis. Do not alter paid payroll records automatically—export them for approval and create adjustment entries after confirmation.

### 7.6 Missing supplier payment repair

Create one idempotent company-payment repair for stock receipt `SR-20260711-0001`, payable ID 45, company ID 5, amount **7,520**, dated 2026-07-11. Link it to the payable/receipt and retain the original creator if reliably recoverable; otherwise use the repair operator and document the reason.

Expected result:

```text
sum(stock receipt/payable paid amounts) = sum(linked company payments)
```

### 7.7 Inventory-cost repair

Run the existing historical batch-cost backfill after its dry-run output is approved. The current dry run indicates 342 null-cost batches can be resolved and zero should remain unresolved.

Recalculate stock holding value after repair. The restored backup's historical resolver produces approximately **130,002,400.43**, compared with the current report's **128,671,213.59**. The exact deployed result becomes the signed control total.

### 7.8 Post-repair refresh

- Refresh invoice settlement caches.
- Recalculate customer balances and company-specific credit status.
- Recalculate commission adjustment summaries.
- Do not rewrite original transaction dates.
- Re-run every financial audit and compare results to the signed dry run.

---

## 8. Delivery Phases

### Phase 0 — Finance decisions and freeze rules

Status: **Complete**. See `docs/financial-integrity-phase-0-decisions.md`.

- Approve accounting formulas, FOC policy, overpayment/refund policy, and commission basis.
- Approve status names and role permissions.
- Capture production control totals and define the maintenance window.

Exit criterion: signed accounting and UX behavior specification.

### Phase 1 — Additive schema and compatibility layer

Status: **Application complete**. Production migration remains gated by the deployment runbook.

- Add settlement, FOC disposition, commission adjustment, supplier-payment source, and repair-audit structures.
- Add model casts, constants, relationships, and indexes.
- Backfill new columns in dry-run mode only.

Exit criterion: old application remains operational with the additive schema.

### Phase 2 — Server-side domain logic

Status: **Application complete**. The automated suite passes all 43 tests.

- Implement central settlement calculation.
- Refactor return posting and payment allocation.
- Add transactional locking, idempotency, validation, and audit events.
- Unify report queries and void handling.

Exit criterion: automated domain and API tests pass against a restored backup.

### Phase 3 — UI/UX and reporting

Status: **Application complete**. The production frontend build passes; manual role-based browser acceptance remains a deployment-stage check.

- Update receivables, invoice detail/print, return workflow, supplier receiving, and reports.
- Add consistent status badges, metric definitions, date basis, warnings, and error states.

Exit criterion: role-based browser acceptance tests pass on desktop and supported responsive layouts.

### Phase 4 — Dry-run data migration

Status: **Restored-backup verification complete**. Human approval remains required for 6 historical FOC records and 45 commission adjustments.

- Run all repair commands on a fresh production restore.
- Review quarantined rows and FOC/commission decisions.
- Reconcile pre/post control totals and obtain finance approval.

Exit criterion: zero unexplained differences.

### Phase 5 — Production deployment and repair

Status: **Not run**. No live database migration or repair was performed during implementation.

- Take a verified backup.
- Deploy additive migrations and compatible code.
- Enable the posting maintenance window.
- Run versioned repairs in logged chunks.
- Run reconciliation and smoke tests.
- Enable the new UI/report reads and reopen posting.

Exit criterion: all acceptance controls below pass.

### Phase 6 — Hardening

Status: **Pending production observation period**.

- Monitor reconciliation exceptions.
- Remove compatibility fallbacks only after a stable observation period.
- Add stronger database constraints where production data proves readiness.
- Document month-end close and financial correction procedures.

---

## 9. Test Plan

### 9.1 Required financial scenarios

1. Full return without payment: original invoice remains 107,500; return credit is 107,500; net collectible and balance are zero; settlement is `credited`, not `paid`.
2. Partial return: original invoice remains unchanged; return credit and balance reduce correctly.
3. Payment before return: return produces an overpayment/customer-credit or refund workflow, not a negative balance or silent data loss.
4. Multiple returns: cumulative quantity/value cannot exceed the original line.
5. Return void: credit, stock, FOC, commission, and settlement reverse atomically.
6. Full and partial returns with FOC: every affected reward has an explicit disposition.
7. Cash back plus return: all components reconcile independently.
8. Cross-month return: gross sale remains in invoice month and return appears in return month.
9. Void invoice: excluded from every sales metric, list total, print total, and export.
10. Initial supplier payment on receiving: one linked company-payment row is created, including on safe retry.
11. Inventory cost: available stock cannot silently contribute zero value because cost is null.
12. Concurrent payment/return attempts: row locks and validation prevent over-allocation or over-return.

### 9.2 Regression coverage

- Unit tests for settlement formulas and rounding boundaries.
- Service tests for transactions, locks, retries, return void, and payment reversal.
- API tests for role permissions, server-side totals, and validation messages.
- Report tests comparing screen, print, and export totals.
- Migration tests for clean database, current database, and restored production backup.
- Browser tests for payment modal, invoice timeline, return/FOC decisions, and report filters.
- Performance tests for monthly/yearly reporting and chunked repair commands.

---

## 10. Production Acceptance Criteria

The change is complete only when:

- False `paid` invoices with zero payments fall from 35 to 0.
- All 37 returned invoices retain their original issued amounts and lines.
- Gross sales - posted returns - approved cash back reconciles to net sales under the approved policy.
- August 2026 reproduces the approved event-date gross baseline of 119,742,656, cash-back baseline of 437,500, return baseline of 5,612,120, and net-sales baseline of 113,693,036, subject only to documented rounding.
- Cross-month returns affect the return month without rewriting original-month gross sales.
- Dashboard, finance overview, customer pages, invoice report, print, and exports exclude void invoices consistently; the current August difference of 3,566,800 is eliminated.
- Supplier cash outcome includes the missing 7,520 payment and reconciles to paid payables.
- No available stock batch is silently valued at zero because of missing cost; unresolved amounts are explicitly shown if any remain.
- All 71 historical FOC units have an approved disposition before their repair is finalized.
- Commission reversal proposals exist for all 37 returned orders and are approved before payroll adjustment.
- Customer balances, credit blocks, payments, allocations, returns, payables, and inventory controls all reconcile with zero unexplained differences.
- Every repair is idempotent, logged, and reproducible from the backup plus command version.

---

## 11. Rollback and Recovery

- Additive schema migrations should remain in place during a code rollback; old columns stay available until the observation period ends.
- Before data repair, store a verified database backup and the dry-run artifact.
- Repair commands must checkpoint processed IDs and record before/after values.
- If reconciliation fails before reopening posting, stop, preserve logs, and restore the verified backup rather than attempting ad hoc SQL corrections.
- UI/report feature flags may switch reads back to compatibility fields while the database is investigated.
- Never roll back by deleting posted payments, returns, inventory movements, or audit entries.

## 12. Deliverables

- Approved accounting and FOC decision record.
- Additive Laravel migrations and rollback definitions.
- Central settlement and financial-report services.
- Refactored return, payment, receiving, invoice, and customer-balance workflows.
- Updated receivables, invoice, return, receiving, reporting, print, and export UI.
- Versioned audit and repair commands with dry-run exports.
- Automated unit, integration, migration, and browser tests.
- Production reconciliation report and post-deployment monitoring checklist.
