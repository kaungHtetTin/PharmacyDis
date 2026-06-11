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
| `/office/products` | Products | Product setup, barcode, primary image, product-unit pricing, base unit, product discount percentage, product commission rate, and product-linked FOC rules. |
| `/office/units` | Units | Unit master records and read-only product-specific conversion preview. |
| `/office/pharmacies` | Pharmacies | Customer records, balances, histories, company-specific credit status. |
| `/office/pharmacies-detail` | Pharmacy Detail | Pharmacy profile, performance, orders, invoices, payment history, filtering, and pagination. |
| `/office/representatives` | Sales Representatives | Rep records, company/product access, performance preview. |
| `/office/representatives-detail` | Sales Representative Detail | Rep profile, performance chart, sales history, top products, pharmacy ranking, and commission preview. |
| `/office/inventory` | Inventory | Current stock, batch stock, stock movements, low stock and expiry alerts. |
| `/office/receiving` | Stock Receiving | Company receiving, stock quantity update, payable preview, receiving voucher. |
| `/office/orders` | Sales Orders | Approval queue, reject flow, stock/credit/FOC review, warehouse checklist. |
| `/office/invoices` | Invoices | Invoice detail, invoice print, delivery voucher, payment receipt. |
| `/office/payments` | Payments | Customer payments and invoice allocation. |
| `/office/receivables` | Accounts Receivable | Customer aging and company-specific credit blocking. |
| `/office/payables` | Accounts Payable | Company payable aging and settlement tracking. |
| `/office/reports-representatives` | Sales Representative Reports | Rep performance, order count, product-based commission preview, assigned company, and customer coverage. |
| `/office/reports-pharmacies` | Pharmacy Reports | Pharmacy purchases, outstanding balances, payment history, and company-specific credit status. |
| `/office/reports-finance` | Finance Reports | Receivables, payables, collections, aging buckets, and overdue states. |
| `/office/settings` | Settings | Users, roles, permission matrix, local storage, credit policy. |

### Sales Representative Application

| Route | Screen | Purpose |
| --- | --- | --- |
| `/sales/login` | Login | Sales representative sign-in; signup is not included. |
| `/sales/dashboard` | Dashboard | Today orders, submitted count, monthly sales, and vertical monthly sales/order bar chart. |
| `/sales/stock` | Stock | Assigned-company stock availability by product, batch, expiry, and base quantity with pagination. |
| `/sales/pharmacies` | Pharmacies | Customer list with row navigation to pharmacy detail. |
| `/sales/pharmacies-detail` | Pharmacy Detail | Customer profile, assigned-company credit status, purchase history, payment history, and pagination. |
| `/sales/new-order` | New Order | Order submit form with fixed sales representative and company context, assigned product lines, base conversion, FOC, and company credit blocking. |
| `/sales/orders` | Order History | Submitted/approved/rejected/delivered orders with status timeline and rejection reason. |
| `/sales/profile` | Edit Profile | Sales representative profile editing and assigned company review. |

## Office Table Columns and Form Fields

| Screen | Table Columns | Form Fields |
| --- | --- | --- |
| Dashboard | Metrics, top products, top pharmacies, top sales representatives, alerts | None |
| Companies | Company, Contact, Agreement, Products, Product Commissions, FOC Rules, Status | Company name, Contact person, Phone number, Email, Agreement type, Payment term days, Address, Agreement information, Status |
| Products | Product, Barcode, Company, Category, Brand, Base Unit, Unit Prices, Base Stock, Discount, Commission, FOC Rule, FOC, Setup, Status | Product code, Product name, Barcode, Company, Category, Brand, Product image, Minimum stock level in base unit, Expiry alert days, Product discount percentage, Product commission rate, FOC rule type, buy quantity or spend value, get quantity, FOC status, FOC date range, Setup status, Review note, Tax method, Status |
| Units | Unit, Short Name, Usage, Products, Product Usage Example, Status | Unit name, Short name, Usage, Status |
| Pharmacies | Pharmacy, Owner, Phone, Township, Outstanding, Credit, Status | Pharmacy name, Owner name, Phone number, Township, Credit limit, Payment term days, Address, Finance note, Status |
| Pharmacy Detail | Order, Invoice, Payment history tables | Full page with performance metrics, credit status, filters, pagination, page-level Create order/Save/Delete, order Save/Delete/Generate invoice, shared invoice detail drawer/print previews, and compact invoice icon actions with More for Edit/Print/Delete |
| Sales Representatives | Employee, Phone, Region, Assigned Company, Product Access, Monthly Sales, Orders, Status | Employee code, Name, Phone number, Email, Region, Assigned company, Product access mode, Assigned product note, Status |
| Sales Representative Detail | Order, Pharmacy, Company, Date, Amount, Status | Read-only performance chart and sales history review |
| Inventory | Product, Batch, Warehouse, Available, Reserved, Sold, Damaged, Expired, Expiry, Status | Product, Batch number, Warehouse, Adjustment type, Quantity, Unit, Base quantity preview, Reason |
| Stock Receiving | Receipt, Company Invoice, Company, Warehouse, Items, Base Qty, Payable, Due, Payment, Received Date, Status | Company, Company invoice number, Received date, Product, Batch number, Manufacturing date, Expiry date, Quantity, Received unit, Base quantity preview, Unit cost, Selling price for selected unit, Payment status, Paid amount, Payable due date |
| Sales Orders | Order, Pharmacy, Sales Rep, Company, Date, Base Qty, Credit, Stock, Total, Status | Opened from selected pharmacy; Company selector first, company credit status, sales representative filtered by selected company, requested delivery date, order note, multiple order item rows with Product, Quantity, Selected unit, Unit price preview, Converted base quantity preview, Discount, FOC item preview, Line total, Approval decision, Approval note, Reject reason. Blocked company credit disables order creation. |
| Invoices | Invoice, Order, Pharmacy, Due Date, Amount, Status | Opened from selected approved order; Invoice date, Due date, Payment status, Print template, Document note, contextual Record payment, and icon row actions with More for Edit/Print/Delete |
| Payments | Payment, Customer, Invoice, Amount, Method, Status | Customer, Invoice, Received amount, Payment method, Payment date, Allocation note |
| Receivables | Customer, Company, Current, 1-7 Days, 8-30 Days, Status | Customer, Company, Credit term days, Due date, Credit status |
| Payables | Company, Receipt, Company Invoice, Amount Due, Paid, Due Date, Status | Company, Stock receipt, Company invoice number, Payment amount, Payment date, Payment status |
| Sales Representative Reports | Sales Rep, Companies, Orders, Sales, Commission Preview, Status | Sales representative, Company, Start date, End date, Export format |
| Pharmacy Reports | Pharmacy, Owner, Orders, Sales, Outstanding, Credit | Pharmacy, Credit status, Start date, End date, Export format |
| Finance Reports | Report, Current, Warning, Critical, Total, Status | Finance report type, Aging status, Start date, End date, Export format |
| Settings | Setting, Group, Value, Owner, Updated, Status | User name, Email, Role, Permission group, Credit term days, Local storage path, Near expiry alert days |

## Sales Representative Table Columns and Form Fields

| Screen | Table Columns | Form Fields |
| --- | --- | --- |
| Login | None | Employee code or phone, Password, Remember device |
| Dashboard | Today orders, submitted count, monthly sales, and vertical monthly sales/order bar chart | None |
| Stock | Product, Batch, Available, Base Qty, Expiry, Status | Search, status filter, pagination |
| Pharmacies | Pharmacy, Owner, Phone, Outstanding, Company Credit, Status | Row opens pharmacy detail page |
| Pharmacy Detail | Purchase history, Payment history | Create order from selected pharmacy context; purchase and payment tables include filters, date field, and pagination |
| New Order | Direct submit form | Opened from pharmacy card or New Order tab; sales representative and assigned company are fixed by login account, no company or sales rep selectors; multiple order item rows with Product, Quantity, Product unit, Unit price preview, Base quantity preview, FOC preview, Credit warning. Blocked company credit disables order creation. |
| Order History | Order, Pharmacy, Total, Submitted, Status | Create order redirects to new order flow |
| Edit Profile | None | Name, Employee code, Phone number, Email, Region, Profile note |

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
- Product commission rate belongs to Product CRUD, not a separate commission rules page.
- Product discount percentage belongs to Product CRUD and applies during order line total calculation.
- FOC rules are managed from Product CRUD; there is no standalone FOC Rules page in the MVP UI.
- Product unit pricing must support one base unit and multiple selling units per product.
- Unit conversion factors belong to product-unit rows, not unit master records.
- Inventory stock balance should be stored in base units.
- Receiving from company creates stock batches, inventory movement records, and company payable records.
- Company payable aging is alert-only.
- Customer/pharmacy credit blocking can block order approval by company.
- Each sales representative is assigned to one company; product visibility is filtered by that assigned company.
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
