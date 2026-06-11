# Pharmaceutical Distribution Management System

## Software Requirements Specification

Version: 1.0  
Scope: MVP  
Platform: Office Web Application and Sales Representative Web Application

---

## 1. Project Overview

The Pharmaceutical Distribution Management System is a centralized platform for pharmaceutical distributors who receive products from pharmaceutical companies, store them in warehouses, and distribute them to pharmacies through sales representatives.

The system is designed to manage daily operations without the complexity of a full ERP. Both office users and sales representatives will use web applications built with Laravel, React, and MySQL.

Primary goals:

- Manage pharmaceutical companies, products, pharmacies, and sales representatives.
- Receive and track warehouse stock by batch and expiry date.
- Support multi-unit pharmaceutical packaging and stock conversion.
- Allow sales representatives to create pharmacy orders from products belonging to their assigned company.
- Provide admin approval, warehouse dispatch, invoicing, and delivery workflows.
- Track customer payments, company payables, commissions, FOC rules, and reports.

---

## 2. Applications

### 2.1 Office Web Application

Used by:

- Owner
- Admin
- Warehouse staff
- Finance staff

Purpose:

- Manage master data.
- Manage inventory and stock receiving.
- Approve or reject sales orders.
- Generate invoices, vouchers, and receipts.
- Track receivables and payables.
- View dashboards and reports.

Platform requirements:

- Web application.
- Responsive for desktop and tablet.

### 2.2 Sales Representative Web Application

Used by:

- Sales representatives.

Purpose:

- View assigned products.
- View stock availability.
- View pharmacy/customer information.
- Create and submit sales orders.
- Track order status and own sales records.

Platform requirements:

- Web application.
- Responsive for desktop, tablet, and mobile browser usage.
- Optimized for field sales representatives using phones or tablets.

---

## 3. Business Actors

### 3.1 Pharmaceutical Company

Supplies products to the distributor.

Responsibilities:

- Provide products.
- Define product prices.
- Define product commission rates.
- Define FOC policies.

### 3.2 Distributor

The business owner and primary user of the system.

Responsibilities:

- Receive stock from companies.
- Store products in warehouses.
- Sell products to pharmacies.
- Manage receivables and payables.
- Generate operational and financial reports.

### 3.3 Sales Representative

Field staff who manage pharmacy relationships and create orders.

Responsibilities:

- Visit pharmacies.
- Promote products.
- Create sales orders.
- View assigned product and stock information.

Restrictions:

- Can only access products from the assigned company.
- Can only sell products from the assigned company.
- Cannot approve orders.
- Cannot modify inventory.
- Can only view available stock.

### 3.4 Pharmacy

Customer that purchases products from the distributor.

Responsibilities:

- Purchase products.
- Make payments.
- Receive invoices, delivery vouchers, and payment receipts.

---

## 4. User Roles and Permissions

### 4.1 Admin

Permissions:

- Full system access.
- Manage users and settings.
- Manage companies, products, customers, and sales representatives.
- Manage inventory.
- Approve or reject orders.
- Manage payments.
- View reports.

### 4.2 Warehouse Staff

Permissions:

- Receive products.
- Update stock.
- View inventory.
- Prepare approved orders.
- Dispatch products.
- Record stock adjustments.

Restrictions:

- Cannot manage financial payments unless explicitly granted.

### 4.3 Finance Staff

Permissions:

- Record customer payments.
- Track receivables.
- Track payables to companies.
- Generate financial reports.

Restrictions:

- Cannot modify inventory unless explicitly granted.

### 4.4 Sales Representative

Permissions:

- View assigned products.
- View available stock.
- View assigned or allowed customers.
- Create orders.
- View own sales records and order history.

Restrictions:

- Cannot approve orders.
- Cannot modify inventory.
- Cannot access products outside the assigned company.

---

## 5. Functional Requirements

### 5.1 Company Management

The system must allow admins to manage pharmaceutical companies.

Company fields:

- Company name.
- Contact person.
- Phone number.
- Address.
- Agreement information.
- Status.

Company product assignment:

- A company can have multiple products.
- Products can have company-specific pricing rules.
- Products can have company-specific FOC rules.

### 5.2 Product Management

The system must allow admins to manage products.

Product fields:

- Product code.
- Product name.
- Product image.
- Description.
- Company.
- Category.
- Brand.
- Minimum stock level in base unit.
- Expiry alert days.
- Product discount percentage.
- Tax method, if tax is enabled.
- Status.

Product unit pricing:

- Each product must have one or more product units.
- Each product must have exactly one base unit.
- Each product unit must store unit, conversion factor to base unit, selling price for that unit, and base-unit flag.
- Product-level selling price must not be treated as a single flat price when multiple units are available.
- Sales order, receiving, invoice, and stock movement screens must show the selected unit and the converted base-unit quantity.

Product commission:

- Commission rate must be defined on the product.
- A product commission rate applies to sales of that product regardless of the selling unit.
- Company screens may summarize product commission coverage, but company-level default commission rates are not used for MVP calculation.

Product discount:

- Discount percentage must be defined on the product.
- A product discount percentage applies to sales of that product regardless of the selling unit.
- Order creation should use the product discount percentage when calculating line discount and totals.

Product FOC rules:

- FOC rules should be visible and manageable from product records.
- In product-linked FOC setup, the selected product is the eligible product and default reward product, so no eligible-product or reward-product selector is needed.
- Product list screens should show the current FOC rule and FOC status for each product.
- Product detail may remain a drawer for MVP, with product-linked FOC rule cards shown in the drawer.
- There is no standalone FOC Rules page in the MVP UI; full promotion review happens from product records and reports.

Product image requirements:

- Support one primary product image upload.

### 5.3 Multi-Unit Management

The system must support pharmaceutical packaging structures and automatic unit conversion.

Example:

- 1 Box = 10 Cards.
- 1 Card = 10 Bottles.
- Therefore, 1 Box = 100 Bottles.

Required features:

- Define units.
- Define product-specific unit conversion and unit price rules.
- Store inventory in a base unit.
- Sell by larger or smaller units.
- Support partial-unit selling.
- Automatically update stock using base-unit conversion.

Unit rules:

- Units are master records such as Tablet, Capsule, Milliliter, Bottle, Card, Box, Carton, and Case.
- Units must include a display name and short name.
- Product-specific unit rules are stored separately from unit master records.
- A product unit conversion factor means how many base units are represented by one selected unit.
- Example: if Tablet is the base unit, Card may have conversion factor 10 and Box may have conversion factor 100.
- Units assigned to product-unit pricing rows should not be deleted unless those product assignments are removed or archived.

Example sale:

- 1 Box.
- 5 Cards.
- 15 Bottles.

The system must convert all quantities to the base unit and deduct the correct stock amount.

Backend calculation rule:

- Client-entered selected unit and quantity are accepted only after validating that the selected unit belongs to the selected product.
- Unit selling price and conversion factor must be calculated from trusted server-side product-unit records.
- Stock reservation, stock deduction, batch balances, and valuation must use base-unit quantity.

### 5.4 Customer or Pharmacy Management

The system must allow admins and finance staff to manage pharmacy customers.

Customer fields:

- Pharmacy name.
- Owner name.
- Phone number.
- Address.
- Status.

Customer history:

- Purchase history.
- Outstanding balance.
- Payment history.
- Company-specific credit status.

### 5.5 Sales Representative Management

The system must allow admins to manage sales representatives.

Sales representative fields:

- Employee code.
- Name.
- Phone number.
- Assigned company.
- Status.

Business rules:

- A sales representative can only view products from the assigned company.
- A sales representative can only sell products from the assigned company.

### 5.6 Inventory Management

The system must track product stock in real time.

Stock receiving fields:

- Company.
- Company invoice number.
- Received date.
- Product.
- Batch number.
- Manufacturing date.
- Expiry date.
- Quantity.
- Unit.
- Base-unit quantity preview.
- Stock quantity to add in base units.
- Unit cost.
- Selling price for selected unit, if updated during receiving.
- Payment status: Paid, Partial, or Due.
- Paid amount.
- Due amount.
- Payable due date.

Stock receiving rules:

- Receiving from a company should follow the purchase receiving pattern from the reference pharmacy system, but the supplier entity is replaced by pharmaceutical company.
- A receiving document must support multiple received items.
- For each item, the selected unit must belong to the selected product.
- The system must calculate conversion factor, base-unit quantity, base-unit cost, and base-unit selling price.
- Saving a receiving document must increase stock quantity by the calculated base-unit quantity for each item.
- Batch and inventory balances must be stored in base units.
- If the same product, batch, and expiry already exists, the system should update the existing batch quantity and cost using a consistent costing rule.
- Receiving must create stock movement records.
- Receiving must create or update company payable records.
- Receiving must run inside a database transaction so stock, batches, movements, and payables remain consistent.
- Editing a completed receiving document must reverse previous stock and payable effects before applying the new values.
- Deleting or cancelling a receiving document must reverse stock and payable effects if the stock has not already been sold or reserved.

Stock balances:

- Available stock.
- Reserved stock.
- Sold stock.
- Damaged stock.

Stock movement types:

- Received.
- Sold.
- Reserved.
- Released.
- Adjusted.
- Damaged.

Inventory alerts:

- Low stock products.
- Near-expiry products.
- Expired products.

### 5.7 Batch and Expiry Tracking

Each stock batch must include:

- Batch number.
- Manufacturing date.
- Expiry date.
- Received quantity.
- Remaining quantity.

Expiry alert rules:

- Near expiry: less than 90 days remaining.
- Expired: expiry date reached or passed.

### 5.8 Sales Order Management

Sales representatives must be able to create orders from the sales representative web application.

Order creation fields:

- Pharmacy.
- Product.
- Quantity.
- Unit.
- Base-unit quantity preview.
- Selling price.
- FOC quantity, if applicable.

Validation rules:

- Order quantity cannot exceed available stock.
- Order quantity must be converted to base-unit quantity before stock validation.
- Selected unit must belong to the selected product.
- Sales representative cannot order products from an unassigned company.
- Customer status must allow ordering.
- Credit control rules must be checked before submission or approval.

Order statuses:

- Draft.
- Submitted.
- Approved.
- Rejected.
- Delivered.
- Completed.

### 5.9 Order Approval Workflow

Workflow:

1. Sales representative creates an order.
2. Sales representative submits the order.
3. Admin reviews the order.
4. Admin approves or rejects the order.
5. Warehouse prepares approved products.
6. Invoice is generated.
7. Products are delivered.
8. Payment is tracked.

Rules:

- Submitted orders reserve stock if configured by the system.
- Rejected orders release reserved stock.
- Approved orders are available for warehouse preparation.
- Delivered orders create receivable balances.

### 5.10 FOC Management

FOC means "Free of Charge" products provided by pharmaceutical companies as a promotion.

FOC rule example:

- Buy 10 Boxes.
- Get 1 Box free.

Required features:

- Product-specific FOC rules.
- Company-specific FOC rules.
- Automatic FOC calculation during order creation.
- Quantity-based FOC rules.
- Value-based FOC rules.
- Promotion start date and end date.

Quantity-based rule example:

- Buy X quantity.
- Get Y quantity free.

Value-based rule example:

- Spend 1,000.
- Get 1 Box free.

Split FOC support:

- If a FOC rule is based on 10 Boxes and two pharmacies each buy 5 Boxes, the system should support calculating proportional FOC quantities when the business enables split FOC.

### 5.11 Commission Management

The system must calculate sales commissions based on product rules.

Examples:

- Paracetamol 500mg: 8%.
- Amoxicillin 250mg: 5%.
- Vitamin C Syrup: 12%.

Formula:

```text
Commission = Sales Amount x Commission Rate
```

Rules:

- Commission rate is stored on each product.
- Commission calculation uses the sold product commission rate.
- The selected selling unit does not change the commission rate.
- Company commission reports are summaries grouped by product company, not company-level rate calculations.
- Products without a configured commission rate should be flagged during product setup or commission review.

Reports:

- Monthly commission.
- Company commission summary.
- Product commission summary.
- Sales representative commission summary, if enabled.

### 5.12 Invoice and Voucher Management

The system must generate printable transaction documents.

Required documents:

- Sales invoice.
- Delivery voucher.
- Payment receipt.
- Stock receiving voucher.
- Company settlement report.

Printing support:

- A4 printing.
- Thermal printing optional.

### 5.13 Payment Tracking

Customer payment tracking:

- Invoice amount.
- Paid amount.
- Remaining balance.
- Payment date.
- Payment method.
- Credit balance, if any.

Company payment tracking:

- Amount owed to company.
- Stock receiving reference.
- Company invoice number.
- Due date.
- Paid amount.
- Remaining balance.
- Payment status.

Company payable rules:

- Company payables are created from stock receiving.
- Default company payable due date is 7 days after receiving unless company terms define a different due date.
- Unlike supplier credit-limit validation in the reference pharmacy purchase flow, company stock receiving is not blocked by a supplier credit limit in this MVP.
- Overdue company payables create finance alerts only.
- Company payable alerts must not block stock receiving, order approval, sales representative order creation, invoicing, or delivery.
- Customer credit control remains separate from company payable tracking.
- Company payable status should support Due, Partial, Paid, Warning, and Critical states.

### 5.14 Credit Control

Default pharmacy credit terms:

- Payment due in 7 days.

Customer credit statuses:

- Current.
- Warning.
- Critical.
- Blocked.

Rules:

- If overdue by more than 7 days, status becomes Warning.
- If overdue by more than 30 days, status becomes Critical or Blocked.
- Blocking is company-specific.

Company-specific blocking example:

- Pharmacy A has an unpaid overdue invoice for Company A.
- Pharmacy A cannot order Company A products.
- Pharmacy A can still order Company B products if Company B has no blocking issue.

### 5.15 Accounts Receivable

The system must track money owed by pharmacies.

Tracked data:

- Outstanding invoices.
- Customer payments.
- Credit balances.
- Aging reports.

Aging categories:

- Current.
- 1-7 days.
- 8-30 days.
- 31-60 days.
- 60+ days.

### 5.16 Accounts Payable

The system must track money owed to pharmaceutical companies.

Default rule:

- Pay company within 7 days after receiving stock.

Alert rules:

- Due within 7 days: reminder.
- Overdue more than 7 days: warning.
- Overdue more than 30 days: critical.

### 5.17 Notifications

MVP notification type:

- In-app notifications.

Notification events:

- New order submitted.
- Order approved.
- Order rejected.
- Low stock.
- Near expiry.
- Overdue customer payment.
- Overdue company payment.

Future notification support:

- Browser push notifications.
- Real-time web notifications.

### 5.18 Dashboard

The admin dashboard must provide operational visibility.

Dashboard metrics:

- Total sales.
- Monthly sales.
- Monthly revenue.
- Outstanding receivables.
- Outstanding payables.
- Low stock products.
- Expiry alerts.
- Due payment alerts.
- Top products.
- Top pharmacies.
- Top sales representatives.

### 5.19 Reporting

Sales reports:

- Daily sales.
- Monthly sales.
- Annual sales.

Product reports:

- Best-selling products.
- Slow-moving products.
- Product sales summary.

Customer reports:

- Purchase summary.
- Outstanding balance.
- Customer ranking.

Sales representative reports:

- Sales performance.
- Order count.
- Revenue generated.
- Sales ranking.

Company reports:

- Sales by company.
- Commission by company.
- Company-wise outstanding balance.

Inventory reports:

- Current stock.
- Stock movement.
- Stock valuation.
- Expiry report.

Financial reports:

- Revenue tracking.
- Expense tracking.
- Monthly profit and loss.
- Quarterly profit and loss.
- Yearly profit and loss.

---

## 6. Office Web Application Screens

Estimated MVP screen count: about 25 screens.

Suggested screens:

- Login.
- Dashboard.
- Company list.
- Company create/edit.
- Product list.
- Product create/edit.
- Unit management.
- Product-unit conversion setup inside Product CRUD.
- Pharmacy/customer list.
- Pharmacy/customer detail.
- Sales representative list.
- Sales representative create/edit.
- Inventory dashboard.
- Stock receiving list.
- Stock receiving create.
- Stock movement history.
- Batch and expiry report.
- Sales order list.
- Sales order detail.
- Order approval queue.
- Invoice list.
- Payment tracking.
- Accounts receivable.
- Accounts payable.
- Reports.
- Settings.

---

## 7. Sales Representative Web Application Screens

Estimated MVP screen count: about 10 screens.

Suggested screens:

- Login.
- Dashboard.
- Product catalog.
- Product detail.
- Stock availability.
- Pharmacy list.
- Pharmacy detail.
- Order creation.
- Order history.
- Order detail.
- Performance dashboard.

---

## 8. Database Scope

Estimated MVP tables: 25-35.

Core tables:

- users.
- roles.
- companies.
- products.
- primary product image path on products.
- units.
- product_units.
- customers.
- sales_representatives.
- stock_batches.
- stock_receipts.
- stock_receipt_items.
- stock_movements.
- sales_orders.
- sales_order_items.
- invoices.
- invoice_items.
- payments.
- foc_rules.
- notifications.
- settings.

Possible supporting tables:

- warehouses.
- product_categories.
- brands.
- Do not create global unit conversion rules for MVP; conversion factors belong to product_units.
- customer_company_credit_statuses.
- company_payables.
- expenses.
- audit_logs.

---

## 9. API Scope

Estimated MVP API endpoints: 40-60.

API groups:

- Authentication.
- User and role management.
- Company management.
- Product management.
- Primary product image management.
- Unit and conversion management.
- Customer management.
- Sales representative management.
- Stock receiving.
- Stock batches.
- Stock movements.
- Sales orders.
- Order approval.
- Invoice management.
- Payment management.
- FOC rules.
- Commission rules.
- Notifications.
- Dashboard metrics.
- Reports.
- Settings.

---

## 10. UI and UX Requirements

The office web application should use the operational admin dashboard style defined in `docs/admin-dashboard-ui-kit.md`.

Design principles:

- Compact, information-dense layout.
- Operational dashboard, not a marketing page.
- Sidebar navigation.
- Sticky topbar.
- Glass-style panels, sidebar, topbar, modals, and drawers.
- Tables for data-heavy screens.
- Right drawer for detail views.
- Modals for create/edit workflows.
- Semantic status badges.
- Light and dark theme support.
- Configurable brand color.
- Responsive behavior for desktop, tablet, and mobile fallback.

Typography:

- Inter.
- Noto Sans Myanmar.
- System sans-serif fallback.

Primary admin layout:

- Metrics first.
- Wide operational queues next.
- Side summaries and alerts where helpful.

---

## 11. Technology Stack

Backend:

- Laravel.
- Laravel API for frontend data access.

Frontend:

- React.
- Tailwind CSS.

Database:

- MySQL.

Cache:

- Redis optional for MVP.

File storage:

- Local filesystem storage.
- Primary product images, documents, invoices, and vouchers will be stored on the application server.

Reporting:

- Laravel Excel.
- PDF export.

Notifications:

- In-app notifications for MVP.
- Browser-compatible notification support optional in later phases.

---

## 12. Non-Functional Requirements

### 12.1 Security

- Authenticated access is required for all system functions.
- Role-based access control is required.
- Sales representatives must be restricted to products from their single assigned company.
- Sensitive financial operations must be protected by permissions.
- Passwords must be hashed securely.
- API access must use secure tokens or sessions.

### 12.2 Auditability

The system should keep audit history for important operations:

- Stock receiving.
- Stock adjustment.
- Order approval or rejection.
- Invoice generation.
- Payment recording.
- User changes.

### 12.3 Performance

- Dashboard and table screens should load efficiently for daily operations.
- Data tables should support search, filtering, sorting, and pagination.
- Stock checks must be fast enough for sales representative order creation.

### 12.4 Reliability

- Stock quantities must remain consistent during order approval and dispatch.
- Payment and invoice balances must remain accurate.
- Batch and expiry tracking must not allow ambiguous stock deductions.

### 12.5 Localization

- UI should support English.
- Myanmar font support is required through Noto Sans Myanmar.
- Future localization should be possible.

---

## 13. MVP Scope Summary

The MVP must cover:

- Company management.
- Product management.
- Multi-unit stock conversion.
- Pharmacy management.
- Sales representative management.
- Inventory and batch tracking.
- Sales order creation and approval.
- Invoice and voucher generation.
- Customer payment tracking.
- Company payable tracking.
- Credit control.
- FOC calculation.
- Commission calculation.
- In-app notifications.
- Dashboards and operational reports.

Estimated implementation scope:

- Office web application: about 25 screens.
- Sales representative web application: about 10 screens.
- Database: about 25-35 tables.
- API: about 40-60 endpoints.
- Estimated duration: 6-10 weeks.

---

## 14. Future Enhancements

Future scope beyond MVP:

- Progressive Web App support for better mobile browser usage.
- Browser push notifications.
- Advanced profit and loss reporting.
- Advanced route planning for sales representatives.
- Multi-warehouse transfers.
- Barcode scanning.
- Thermal printer integration.
- Advanced approval workflows.
- Advanced analytics and forecasting.
- Redis caching.
