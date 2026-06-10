# Phase 3 Frontend Review and UI Freeze

Status: Freeze candidate prepared.

This document records the current frontend scope after Phase 1 and Phase 2. It is intended for stakeholder review before database migrations and backend APIs begin.

## Review Status

- Office UI: ready for stakeholder review.
- Sales representative UI: ready for stakeholder review.
- Backend dependency: none in the reviewed screens.
- Route model: Laravel web endpoints with simple React route state.
- Storage assumption: local filesystem storage.
- Data source during review: mock data only.
- Stakeholder approval: pending.
- UI freeze: pending approval.

## Verification Checklist

- Every route loads directly in the browser.
- Office navigation uses real `/office/{page}` URLs.
- Sales representative navigation uses real `/sales/{page}` URLs.
- Browser refresh keeps the same screen because Laravel resolves the endpoint.
- Empty, loading, and error table states are supported by the shared `DataTable`.
- Create/edit workflows use modal UI.
- Detail workflows use drawer/detail UI.
- Form validation message placeholders are visible where rules are known.
- Sales representative screens are mobile-first.
- Print previews exist for invoice, delivery voucher, payment receipt, and stock receiving voucher.
- Company payable aging remains alert-only and does not block operational workflows.
- Customer/pharmacy credit blocking remains company-specific.

## Final Screen List

### Office Application

| Route | Screen | Purpose |
| --- | --- | --- |
| `/office/dashboard` | Dashboard | Management metrics, top tables, and alerts. |
| `/office/companies` | Companies | Company records, assigned products, FOC summary, product commission coverage. |
| `/office/products` | Products | Product setup, barcode, images, product-unit pricing, base unit, product commission rate. |
| `/office/units` | Units | Unit master and product-specific conversion preview. |
| `/office/pharmacies` | Pharmacies | Customer records, balances, histories, company-specific credit status. |
| `/office/representatives` | Sales Representatives | Rep records, company/product access, performance preview. |
| `/office/inventory` | Inventory | Current stock, batch stock, stock movements, low stock and expiry alerts. |
| `/office/receiving` | Stock Receiving | Company receiving, stock quantity update, payable preview, receiving voucher. |
| `/office/orders` | Sales Orders | Approval queue, reject flow, stock/credit/FOC review, warehouse checklist. |
| `/office/invoices` | Invoices | Invoice detail, invoice print, delivery voucher, payment receipt. |
| `/office/payments` | Payments | Customer payments and invoice allocation. |
| `/office/receivables` | Accounts Receivable | Customer aging and company-specific credit blocking. |
| `/office/payables` | Accounts Payable | Company payable aging and settlement tracking. |
| `/office/foc-rules` | FOC Rules | Quantity/value promotion rules and active date ranges. |
| `/office/commissions` | Product Commission Rules | Product-level commission rate setup and examples. |
| `/office/reports` | Reports | Sales, product, customer, rep, company, inventory, and financial reports. |
| `/office/settings` | Settings | Users, roles, permission matrix, local storage, credit policy. |

### Sales Representative Application

| Route | Screen | Purpose |
| --- | --- | --- |
| `/sales/dashboard` | Dashboard | Assigned companies, today orders, status counts, monthly sales, alerts, quick actions. |
| `/sales/products` | Products | Assigned product catalog with unit prices, stock, FOC, expiry, and barcode. |
| `/sales/stock` | Stock | Assigned stock availability by product, company, batch, expiry, and base quantity. |
| `/sales/pharmacies` | Pharmacies | Customer list/detail, outstanding balance, credit warning, purchase/payment history. |
| `/sales/new-order` | New Order | Pharmacy selector, assigned product selector, unit quantity, base conversion, FOC, credit warning, submit preview. |
| `/sales/orders` | Order History | Submitted/approved/rejected/delivered orders with status timeline and rejection reason. |
| `/sales/performance` | Performance | Monthly sales, order count, top products, pharmacy ranking, commission preview. |

## Office Table Columns and Form Fields

| Screen | Table Columns | Form Fields |
| --- | --- | --- |
| Dashboard | Metrics, top products, top pharmacies, top sales representatives, alerts | None |
| Companies | Company, Contact, Agreement, Products, Product Commissions, FOC Rules, Status | Company name, Contact person, Phone number, Email, Agreement type, Payment term days, Address, Agreement information, Status |
| Products | Product, Barcode, Company, Category, Brand, Base Unit, Unit Prices, Base Stock, Commission, Setup, Status | Product code, Product name, Barcode, Company, Category, Brand, Product image, Minimum stock level in base unit, Expiry alert days, Product commission rate, Setup status, Review note, Tax method, Status |
| Units | Unit, Short Name, Usage, Products, Example Rule, Status | Unit name, Short name, Usage, Status, Product for conversion preview, Base unit explanation, Conversion factor, Selling price for selected product unit |
| Pharmacies | Pharmacy, Owner, Phone, Township, Outstanding, Credit, Status | Pharmacy name, Owner name, Phone number, Township, Credit limit, Payment term days, Address, Finance note, Status |
| Sales Representatives | Employee, Phone, Region, Assigned Companies, Product Access, Monthly Sales, Orders, Status | Employee code, Name, Phone number, Email, Region, Assigned company, Product access mode, Assigned product note, Status |
| Inventory | Product, Batch, Warehouse, Available, Reserved, Sold, Damaged, Expired, Expiry, Status | Product, Batch number, Warehouse, Adjustment type, Quantity, Unit, Base quantity preview, Reason |
| Stock Receiving | Receipt, Company Invoice, Company, Warehouse, Items, Base Qty, Payable, Due, Payment, Received Date, Status | Company, Company invoice number, Received date, Product, Batch number, Manufacturing date, Expiry date, Quantity, Received unit, Base quantity preview, Unit cost, Selling price for selected unit, Payment status, Paid amount, Payable due date |
| Sales Orders | Order, Pharmacy, Sales Rep, Company, Date, Base Qty, Credit, Stock, Total, Status | Pharmacy, Sales representative, Company, Product, Quantity, Selected unit, Unit price preview, Converted base quantity preview, FOC item preview, Customer credit status, Approval decision, Approval note, Reject reason |
| Invoices | Invoice, Order, Pharmacy, Due Date, Amount, Status | Approved order, Invoice date, Due date, Payment status, Print template, Document note |
| Payments | Payment, Customer, Invoice, Amount, Method, Status | Customer, Invoice, Received amount, Payment method, Payment date, Allocation note |
| Receivables | Customer, Company, Current, 1-7 Days, 8-30 Days, Status | Customer, Company, Credit term days, Due date, Credit status |
| Payables | Company, Receipt, Company Invoice, Amount Due, Paid, Due Date, Status | Company, Stock receipt, Company invoice number, Payment amount, Payment date, Payment status |
| FOC Rules | Rule, Type, Company, Product, Validity, Status | Rule type, Company, Eligible product, Buy quantity or spend value, Reward product, Get quantity, Start date, End date |
| Commissions | Product, Company, Rate, Effective Date, Status | Product, Company, Commission rate, Effective date, Status |
| Reports | Report, Period, Records, Owner, Status | Report type, Start date, End date, Company, Export format |
| Settings | Setting, Group, Value, Owner, Updated, Status | User name, Email, Role, Permission group, Credit term days, Local storage path, Near expiry alert days |

## Sales Representative Table Columns and Form Fields

| Screen | Table Columns | Form Fields |
| --- | --- | --- |
| Dashboard | Assigned company coverage table and alert lists | Quick actions only |
| Products | Product, Barcode, Company, Unit Prices, Available, Status | Start order uses Product, Quantity, Product unit, Unit price preview, Base quantity preview |
| Stock | Product, Company, Batch, Available, Base Qty, Expiry, Status | Refresh/search only |
| Pharmacies | Pharmacy, Owner, Phone, Outstanding, Company Credit, Status | New order uses selected pharmacy |
| New Order | Step, Requirement, Validation, Preview, Status | Pharmacy, Product, Quantity, Product unit, Unit price preview, Base quantity preview, FOC preview, Credit warning |
| Order History | Order, Pharmacy, Total, Submitted, Status | Create order redirects to new order flow |
| Performance | Metric, This Month, Last Month, Change, Status | Report period and company filters |

## Shared UI Contracts

- `DataTable`: columns, rows, row click, actions, empty state, loading state, error state.
- `FilterToolbar`: search, select filters, optional date filter, reset.
- `Modal`: create/edit and workflow forms.
- `Drawer`: detail views, review panels, print/detail previews.
- `Tabs`: pharmacy detail, finance, reports, settings, and sales detail sections.
- `PrintPreview`: A4 and receipt preview shells.
- `StatusBadge`: shared display for active, current, ready, warning, critical, blocked, rejected, delivered, paid, due, near expiry, low stock, expired, and related states.

## Backend Planning Notes

- Money values are display strings during UI review; backend should normalize to numeric decimal columns.
- Dates are display strings during UI review; backend should normalize to date/datetime columns.
- Product commission rate belongs to product/product commission rules, not company.
- Product unit pricing must support one base unit and multiple selling units per product.
- Inventory stock balance should be stored in base units.
- Receiving from company creates stock batches, inventory movement records, and company payable records.
- Company payable aging is alert-only.
- Customer/pharmacy credit blocking can block order approval by company.
- Sales representative product visibility is filtered by assigned companies.
- Files use local storage.

## Change Request Log

No open change requests are recorded in this freeze candidate.

## Freeze Decision

Frontend UI can be frozen after stakeholder review confirms:

- Screen list is accepted.
- Form fields are accepted.
- Table columns are accepted.
- Print previews are accepted.
- Mobile sales representative workflow is accepted.
- No additional Phase 1 or Phase 2 UI changes are required before backend work.
