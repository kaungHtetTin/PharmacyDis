# Development Roadmap

## Pharmaceutical Distribution Management System

This roadmap is organized for team development. The project will be built as one Laravel application with React pages for both the office system and the sales representative web app.

Development order:

1. Build all UI/UX screens for the office web application.
2. Build all UI/UX screens for the sales representative web application.
3. Create database migrations and seeders.
4. Develop backend models, services, APIs, and business logic.
5. Connect frontend pages to backend APIs.
6. Test, polish, deploy, and hand over.

---

## Phase 0: Project Foundation

Goal: Prepare a clean shared foundation before screen development begins.

### 0.1 Confirm Product Scope

Tasks:

- Confirm MVP modules from `docs/specification.md`.
- Confirm user roles: Admin, Warehouse Staff, Finance Staff, Sales Representative.
- Confirm that both office and sales representative systems are web apps.
- Confirm technology stack: Laravel, React, MySQL, local filesystem storage.
- Confirm base URL: `http://localhost/paramacy-dis/public`.

Deliverables:

- Final MVP scope agreement.
- Final role and permission matrix.
- Final navigation list for office and sales representative apps.

### 0.2 Frontend Architecture Setup

Tasks:

- Keep React inside the Laravel project through Vite.
- Define frontend folder structure.
- Define shared components folder.
- Define page folder structure for office and sales representative screens.
- Define shared layout components.
- Define route naming convention.
- Define UI state conventions for loading, empty, error, and success states.

Suggested structure:

```text
resources/js/
  app.js
  Root.jsx
  components/
    shared/
    office/
    sales/
  layouts/
    OfficeLayout.jsx
    SalesRepLayout.jsx
  pages/
    office/
    sales/
  data/
    mock/
  styles/
```

Deliverables:

- React app shell.
- Office layout shell.
- Sales representative layout shell.
- Shared UI components.
- Mock data setup for frontend-only development.

### 0.3 UI Design System Setup

Tasks:

- Use `docs/admin-dashboard-ui-kit.md` as the base style guide.
- Define color tokens.
- Define typography.
- Define button, input, table, badge, drawer, and modal styles.
- Define responsive behavior for desktop, tablet, and mobile browser.
- Define status color mapping.
- Define reusable form field components.
- Define reusable data table components.

Deliverables:

- Design tokens.
- Shared React UI components.
- Shared CSS structure.
- Reusable status badge component.
- Reusable modal and drawer components.

---

## Phase 1: Office Web Application UI/UX

Goal: Build all office screens using mock data first. No backend dependency in this phase.

### 1.1 Office App Shell

Tasks:

- Build sidebar navigation.
- Build sticky topbar.
- Build global search placeholder.
- Build notification button.
- Build user profile area.
- Build light/dark theme support if required.
- Build responsive sidebar collapse.

Office navigation:

- Dashboard.
- Companies.
- Products.
- Units.
- Pharmacies.
- Sales Representatives.
- Inventory.
- Stock Receiving.
- Sales Orders.
- Invoices.
- Payments.
- Accounts Receivable.
- Accounts Payable.
- FOC Rules.
- Commission Rules.
- Reports.
- Settings.

Deliverables:

- Office layout shell.
- Navigation state.
- Responsive office layout.

Status: Completed.

Implementation notes:

- Sidebar navigation, sticky topbar, global search placeholder, notification button, and user profile area are implemented.
- Office navigation uses real Laravel web endpoints and local route state.
- Sidebar collapses responsively on small screens.
- Light/dark theme toggle is implemented as frontend UI state without persistence.

### 1.2 Dashboard Screens

Tasks:

- Build management dashboard.
- Add metric cards for total sales, monthly sales, receivables, payables, low stock, and expiry alerts.
- Add top products table.
- Add top pharmacies table.
- Add top sales representatives table.
- Add alert list for low stock, near expiry, overdue customer payments, and overdue company payments.

Deliverables:

- Office dashboard screen.
- Mock dashboard data.
- Dashboard responsive behavior.

Status: Completed.

Implementation notes:

- Management dashboard is implemented with mock data.
- Metric cards include total sales, monthly sales, receivables, payables, low stock, and expiry alerts.
- Dashboard includes top products, top pharmacies, and top sales representatives tables.
- Operational alerts include low stock, near expiry, overdue customer payment, and overdue company payment.
- Dashboard uses responsive grid behavior for desktop, tablet, and mobile widths.

### 1.3 Company Management UI

Screens:

- Company list.
- Company create modal.
- Company edit modal.
- Company detail drawer.
- Company product assignment view.

Tasks:

- Build company table with filters.
- Build status badges.
- Build create/edit form.
- Build company detail drawer.
- Build assigned products section.
- Build product commission coverage and FOC summary sections.

Deliverables:

- Complete company management UI.

Status: Completed.

Implementation notes:

- Company list table includes filters, status badges, agreement type, product count, commission coverage, and FOC coverage.
- Company create/edit modal includes profile fields, agreement terms, payment term, status, and assigned product preview.
- Company detail drawer includes company profile, assigned products, product commission coverage, and FOC summary.
- Product assignment view is included inside the company modal and drawer with product, barcode, commission rate, FOC rule, and setup status.

### 1.4 Product Management UI

Screens:

- Product list.
- Product create modal.
- Product edit modal.
- Product detail drawer.
- Product image gallery.

Tasks:

- Build product table.
- Add company, category, brand, and status filters.
- Build product form.
- Add barcode field and setup review status to product create/edit.
- Add product commission rate update inside the product form.
- Build product-unit pricing grid with unit, conversion factor, selling price, and base-unit selection.
- Build image upload placeholder.
- Build gallery preview UI.
- Show company, barcode, base unit, unit price range, product commission rate, setup status, batch, expiry, and base-unit stock information.

Deliverables:

- Complete product management UI.

Status: Completed.

Implementation notes:

- Product list table includes company, category, brand, barcode, base unit, unit price range, base stock, product commission rate, setup status, and active status.
- Product filters include company, category, brand, base unit, setup status, and status.
- Product create/edit modal includes barcode, image upload placeholder, setup review status, review note, and product commission rate.
- Product-unit pricing grid supports unit, conversion factor, selling price, and base-unit selection preview.
- Product detail drawer shows company, barcode, brand, base unit, unit price range, commission, setup status, batch, expiry, base stock, unit pricing, and gallery preview.
- Product image gallery preview supports primary image, label detail, and package image placeholders using local-storage-ready UI.

### 1.5 Unit and Conversion UI

Screens:

- Unit list.
- Unit create/edit modal.
- Unit conversion setup.

Tasks:

- Build unit master table.
- Build conversion rule table.
- Build product-specific conversion preview, for example Tablet base, Card equals 10 Tablets, Box equals 100 Tablets.
- Add base-unit explanation in form labels only where needed.
- Show conversion preview.

Deliverables:

- Complete unit management UI.

Status: Completed.

Implementation notes:

- Unit master table includes unit name, short name, usage, assigned product count, example conversion, and status badge.
- Create/edit modal includes unit master fields plus product-specific conversion setup fields.
- Conversion setup preview shows product base unit, package units, conversion chain, and stock impact examples.
- Detail drawer includes base-unit explanation, deletion rules, and product-specific conversion previews.
- Base-unit explanation is shown only where conversion setup needs it.

### 1.6 Pharmacy Management UI

Screens:

- Pharmacy list.
- Pharmacy create/edit modal.
- Pharmacy detail drawer.
- Purchase history tab.
- Payment history tab.
- Outstanding balance tab.
- Company credit status tab.

Tasks:

- Build pharmacy table.
- Add status and credit filters.
- Build pharmacy form.
- Build customer detail drawer.
- Build company-specific blocking display.
- Build aging summary display.

Deliverables:

- Complete pharmacy management UI.

Status: Completed.

Implementation notes:

- Pharmacy table includes status and credit filters, customer contact details, township, outstanding balance, credit status, and status badges.
- Pharmacy create/edit modal includes pharmacy profile fields, credit limit, payment term, finance note, and status.
- Detail drawer includes customer facts, company-specific blocking display, aging summary, and company credit status cards.
- Detail tabs include purchase history, payment history, outstanding balance aging, and company credit status.
- Company-specific blocking is shown per company so a customer can be blocked for one company while remaining active for another.

### 1.7 Sales Representative Management UI

Screens:

- Sales representative list.
- Sales representative create/edit modal.
- Sales representative detail drawer.
- Assigned company/product view.

Tasks:

- Build sales representative table.
- Add assigned company filter.
- Build create/edit form.
- Build assignment controls.
- Build performance summary preview.

Deliverables:

- Complete sales representative management UI.

Status: Completed.

Implementation notes:

- Sales representative table includes assigned company filter, region, assigned companies, product access, monthly sales, order count, and status badge.
- Create/edit modal includes employee profile, region, assigned company, product access mode, assignment note, and status.
- Assignment controls preview assigned companies and product access inside the modal.
- Detail drawer includes representative facts, assigned company/product access view, and performance summary preview.
- Detail tabs include assigned companies, assigned products, and performance records.

### 1.8 Inventory UI

Screens:

- Inventory dashboard.
- Current stock list.
- Batch stock detail drawer.
- Stock movement history.
- Low stock alert list.
- Expiry alert list.
- Stock adjustment modal.

Tasks:

- Build stock table by product and batch.
- Show available, reserved, sold, damaged, and expired quantities.
- Build stock movement timeline.
- Build stock adjustment form.
- Add near-expiry and expired status badges.

Deliverables:

- Complete inventory UI.

Status: Completed.

Implementation notes:

- Inventory table shows product, batch, warehouse, available, reserved, sold, damaged, expired, expiry date, and stock status.
- Detail drawer includes batch stock overview, stock movement timeline, low-stock alerts, and expiry alerts.
- Stock adjustment modal includes product, batch, warehouse, adjustment type, quantity, unit, base quantity preview, and reason.
- Near-expiry, expired, low-stock, available, reserved, damaged, and sold states are represented in mock data.
- Inventory dashboard summaries include available, reserved, sold, damaged, expired, and low-stock totals.

### 1.9 Stock Receiving UI

Screens:

- Stock receiving list.
- Stock receiving create screen.
- Stock receiving detail drawer.
- Stock receiving voucher preview.

Tasks:

- Build receiving list table.
- Build multi-item receiving form.
- Add company and product selectors.
- Add company invoice number, received date, batch number, manufacturing date, expiry date, quantity, unit, and unit cost fields.
- Show converted base-unit quantity and selected-unit selling price.
- Show stock quantity that will be added to inventory before saving.
- Show payment status, paid amount, due amount, and payable due date.
- Show company payable creation preview.
- Build receiving summary.
- Build voucher preview.

Deliverables:

- Complete stock receiving UI.

Status: Completed.

Implementation notes:

- Stock receiving list table includes GRN, company invoice number, company, warehouse, items, base quantity, payable amount, due amount, payment status, received date, and status.
- Create screen uses a multi-item receiving form with company, product, batch, manufacturing date, expiry date, quantity, unit, unit cost, conversion factor, base quantity, selected-unit selling price, and line total.
- Receiving form shows stock quantity that will be added to inventory before saving.
- Payment section shows payment status, paid amount, company payable due, and payable due date.
- Detail drawer shows receiving facts, received item rows, company payable preview, unit conversion notes, and company payable rules.
- Stock receiving voucher preview is available in the detail drawer with GRN, company, invoice, items, and payable due.

### 1.10 Sales Order UI

Screens:

- Sales order list.
- Order approval queue.
- Order detail drawer.
- Order reject modal.
- Order approval confirmation.
- Warehouse preparation view.

Tasks:

- Build order table by status.
- Build filters by sales representative, company, pharmacy, date, and status.
- Build order detail drawer.
- Show ordered items, selected units, converted base quantities, FOC items, stock status, customer credit status, and totals.
- Build approve/reject controls.
- Build warehouse preparation checklist.

Deliverables:

- Complete sales order UI.

Status: Completed.

Implementation notes:

- Built the sales order list with status, sales representative, company, pharmacy, and date-ready filtering.
- Added order detail drawer content for selected units, converted base quantities, FOC items, stock status, customer credit status, and totals.
- Added approval confirmation and reject reason workflow placeholders.
- Added warehouse preparation checklist for stock reservation, picking, expiry/batch checking, and invoice/voucher generation.

### 1.11 Invoice and Voucher UI

Screens:

- Invoice list.
- Invoice detail.
- Invoice print preview.
- Delivery voucher print preview.
- Payment receipt print preview.

Tasks:

- Build invoice table.
- Build invoice detail view.
- Build A4 print layout.
- Build payment receipt layout.
- Build delivery voucher layout.

Deliverables:

- Complete invoice and voucher UI.

Status: Completed.

Implementation notes:

- Built invoice list/detail mock data with order, pharmacy, due date, amount, and payment status.
- Added invoice item detail preview.
- Added A4 invoice, delivery voucher, and payment receipt print previews.

### 1.12 Payment and Finance UI

Screens:

- Customer payment list.
- Customer payment create modal.
- Accounts receivable screen.
- Accounts payable screen.
- Company payment create modal.
- Aging report screen.

Tasks:

- Build receivables table.
- Build payables table.
- Build payment form.
- Build payment allocation UI.
- Build aging categories.
- Build overdue warning and critical states.

Deliverables:

- Complete payment and finance UI.

Status: Completed.

Implementation notes:

- Built customer payment list and payment allocation preview.
- Built receivables and payables aging bucket displays.
- Added overdue warning, critical, blocked, and paid states.
- Preserved the rule that company payable aging is alert-only and does not block operational workflows.

### 1.13 FOC and Commission UI

Screens:

- FOC rule list.
- FOC rule create/edit modal.
- Commission rule list.
- Commission rule create/edit modal.

Tasks:

- Build FOC rule table.
- Build quantity-based FOC form.
- Build value-based FOC form.
- Build promotion date fields.
- Build product commission rule table.
- Build product commission form.

Deliverables:

- Complete FOC and commission UI.

Status: Completed.

Implementation notes:

- Built quantity-based and value-based FOC rule setup previews.
- Added promotion date and active/draft/expired status support in mock data.
- Built product commission rule preview with product-level rate calculations.

### 1.14 Reports UI

Screens:

- Sales reports.
- Product reports.
- Customer reports.
- Sales representative reports.
- Company reports.
- Inventory reports.
- Financial reports.

Tasks:

- Build report filter panels.
- Build report metric cards.
- Build report tables.
- Add export buttons as placeholders.
- Add date range filters.

Deliverables:

- Complete reports UI.

Status: Completed.

Implementation notes:

- Built report category coverage for sales, product, customer, sales representative, company, inventory, and financial reports.
- Added report filters, metric cards, table preview, and export placeholders.
- Added date range fields for report generation forms.

### 1.15 Settings UI

Screens:

- System settings.
- User management.
- Role management.
- Local storage settings.
- Credit policy settings.

Tasks:

- Build settings table/forms.
- Build role permission matrix UI.
- Build credit term settings.
- Build local file storage display.

Deliverables:

- Complete settings UI.

Status: Completed.

Implementation notes:

- Built settings table/forms for users, roles, storage, and credit policy.
- Added role permission matrix UI.
- Added local filesystem storage display.
- Added customer credit term settings and company payable alert-only policy display.

---

## Phase 2: Sales Representative Web Application UI/UX

Goal: Build all sales representative screens with mock data first.

### 2.1 Sales Representative App Shell

Tasks:

- Build sales representative layout.
- Build mobile-first navigation.
- Build dashboard header.
- Build simple profile menu.
- Build responsive behavior for phone, tablet, and desktop browser.

Deliverables:

- Sales representative web layout.
- Mobile-friendly navigation.

Status: Completed.

Implementation notes:

- Built the sales representative web layout with fixed topbar, profile area, notification button, and mobile bottom navigation.
- Added development switch back to office app.
- Added responsive behavior for phone, tablet, and desktop browser widths.

### 2.2 Sales Representative Dashboard

Tasks:

- Show assigned companies.
- Show today order count.
- Show submitted, approved, rejected, and delivered orders.
- Show sales total.
- Show outstanding customer alerts.
- Show quick actions for new order and customer list.

Deliverables:

- Sales representative dashboard UI.

Status: Completed.

Implementation notes:

- Added assigned companies, today order count, monthly sales, assigned item count, and customer alert summaries.
- Added submitted, approved, rejected, and delivered status counters.
- Added quick actions for new order, customer list, and stock check.

### 2.3 Product Catalog

Screens:

- Product catalog.
- Product detail.

Tasks:

- Build product cards/list.
- Add company and category filters.
- Add product image display.
- Show selling price, available stock, FOC promotion, and expiry warning.
- Prevent unassigned company products from appearing in mock data.

Deliverables:

- Product catalog UI.
- Product detail UI.

Status: Completed.

Implementation notes:

- Built assigned-product card/list views with image placeholders.
- Added company, category, and status filters.
- Added selling price by unit, available stock, FOC promotion, expiry warning, barcode, and assigned-company-only mock data.

### 2.4 Stock Availability

Tasks:

- Build stock availability screen.
- Show product, company, batch, expiry date, available quantity, and unit.
- Add search and filters.
- Add low-stock and near-expiry badges.

Deliverables:

- Stock availability UI.

Status: Completed.

Implementation notes:

- Built stock availability table by product, company, batch, expiry date, available quantity, and base unit quantity.
- Added search/filter support plus low-stock and near-expiry badge states.

### 2.5 Pharmacy List and Detail

Screens:

- Pharmacy list.
- Pharmacy detail.

Tasks:

- Build pharmacy list.
- Add search by pharmacy name, owner, or phone.
- Show outstanding balance.
- Show company-specific block warning.
- Show purchase history.
- Show payment history.

Deliverables:

- Pharmacy list UI.
- Pharmacy detail UI.

Status: Completed.

Implementation notes:

- Built pharmacy list with search by pharmacy, owner, or phone.
- Added outstanding balance, company-specific credit warning/block status, purchase history, payment history, and credit tabs.

### 2.6 Order Creation

Screens:

- New order.
- Product selection.
- Cart/order summary.
- Submit confirmation.

Tasks:

- Build pharmacy selector.
- Build product selector filtered by assigned companies.
- Build quantity and unit input.
- Update price when the selected product unit changes.
- Convert selected quantity to base-unit quantity before stock validation.
- Show stock availability during entry.
- Show FOC calculation preview.
- Show credit control warning.
- Prevent quantity above available stock in UI.
- Build order summary.
- Build submit confirmation.

Deliverables:

- Complete order creation UI.

Status: Completed.

Implementation notes:

- Built mobile order creation preview with pharmacy selector, assigned product selector, cart summary, selected unit, converted base quantity, stock validation, FOC preview, credit warning, and submit confirmation.
- Added quantity validation placeholder for preventing orders above available stock.

### 2.7 Order History

Screens:

- Order history.
- Order detail.

Tasks:

- Build order history list.
- Add status filter.
- Add date filter.
- Show order detail with items, FOC, total, status timeline, and rejection reason.

Deliverables:

- Order history UI.
- Order detail UI.

Status: Completed.

Implementation notes:

- Built order history list with status and date-ready filters.
- Added order detail timeline, FOC/total context, and rejection reason display.

### 2.8 Performance Dashboard

Tasks:

- Show monthly sales.
- Show order count.
- Show top products sold.
- Show pharmacy ranking.
- Show commission preview if enabled.

Deliverables:

- Sales representative performance UI.

Status: Completed.

Implementation notes:

- Added monthly sales, order count, top products sold, pharmacy ranking, and product-based commission preview.

---

## Phase 3: Frontend Review and UI Freeze

Goal: Finalize all screens before database and backend implementation.

Tasks:

- Review every screen with stakeholders.
- Check navigation flow.
- Check empty states.
- Check error states.
- Check loading states.
- Check form validation messages.
- Check mobile browser layout.
- Check print preview layouts.
- Collect change requests.
- Apply UI changes.
- Freeze UI scope for backend development.

Deliverables:

- Approved office UI.
- Approved sales representative UI.
- Final screen list.
- Final form field list.
- Final table column list.

Status: Freeze candidate prepared. Pending stakeholder approval.

Implementation notes:

- Created the Phase 3 frontend freeze document at `docs/phase-3-frontend-ui-freeze.md`.
- Documented the final office and sales representative screen lists.
- Documented the final form field list and table column list.
- Verified all office and sales representative routes load directly and mount React.
- Verified production build passes.
- Stakeholder approval is still required before marking the UI fully frozen for backend development.

---

## Phase 4: Database Design and Migrations

Goal: Create a database structure that supports the approved UI and business rules.

### 4.1 Database Planning

Tasks:

- Map every UI screen to required tables.
- Map every form field to database columns.
- Define relationships.
- Define indexes.
- Define enums/status values.
- Define audit requirements.
- Define soft delete requirements.

Deliverables:

- Database ERD.
- Migration checklist.
- Seeder checklist.

### 4.2 Core Master Tables

Migrations:

- roles.
- users.
- companies.
- product_categories.
- brands.
- products.
- product_images.
- units.
- product_units.
- customers.
- sales_representatives.
- sales_representative_company.

Tasks:

- Create migrations.
- Create model relationships.
- Create seeders for roles and sample records.
- Seed each product with at least one base unit and realistic selling prices for larger units.

Deliverables:

- Master table migrations.
- Master data seeders.

### 4.3 Inventory Tables

Migrations:

- warehouses, if needed.
- stock_batches.
- stock_receipts.
- stock_receipt_items.
- stock_movements.
- stock_adjustments.

Tasks:

- Store stock in base units.
- Store product-unit conversion factors and selling prices per product.
- Track batch number and expiry date.
- Track available, reserved, sold, damaged, and expired stock through movements.
- Add indexes for product, company, batch, and expiry date.

Deliverables:

- Inventory migrations.
- Inventory seeders.

### 4.4 Sales and Invoice Tables

Migrations:

- sales_orders.
- sales_order_items.
- invoices.
- invoice_items.
- delivery_vouchers.

Tasks:

- Define order statuses.
- Store product quantity, unit, base-unit quantity, price, discount, FOC, and totals.
- Validate that the selected order unit belongs to the selected product.
- Calculate unit price and conversion factor from server-side product-unit records.
- Link invoices to sales orders.
- Link delivery vouchers to invoices or orders.

Deliverables:

- Sales migrations.
- Invoice migrations.

### 4.5 Finance Tables

Migrations:

- payments.
- payment_allocations.
- customer_balances.
- company_payables.
- company_payments.
- expenses, if MVP includes expense tracking.

Tasks:

- Track invoice payments.
- Track remaining balances.
- Track company payable due dates.
- Track aging data from invoices and payments.

Deliverables:

- Finance migrations.

### 4.6 Rule and Notification Tables

Migrations:

- foc_rules.
- commission_rules.
- customer_company_credit_statuses.
- notifications.
- settings.
- audit_logs.

Tasks:

- Store FOC rule type, value, date range, product, and company.
- Store commission rates by product.
- Store company-specific customer blocking status.
- Store in-app notifications.

Deliverables:

- Rule migrations.
- Notification migrations.
- Settings migrations.

---

## Phase 5: Backend Development

Goal: Build Laravel backend logic after the database structure is ready.

### 5.1 Laravel Backend Foundation

Tasks:

- Configure MySQL connection.
- Configure local filesystem storage.
- Create model relationships.
- Create form request validation classes.
- Create API resource classes.
- Create service classes for business logic.
- Create policy classes for permissions.

Deliverables:

- Backend foundation.
- Model relationship tests.

### 5.2 Authentication and Authorization

Tasks:

- Build login/logout.
- Build role-based access control.
- Protect office routes.
- Protect sales representative routes.
- Restrict sales representative product access by assigned company.

Deliverables:

- Authentication system.
- Permission middleware.

### 5.3 Master Data APIs

API groups:

- Companies.
- Products.
- Product images.
- Units.
- Unit conversions.
- Customers/pharmacies.
- Sales representatives.

Tasks:

- Build CRUD endpoints.
- Add search, filter, sort, and pagination.
- Add validation.
- Add file upload for local product images.

Deliverables:

- Master data APIs.

### 5.4 Inventory Logic and APIs

Tasks:

- Build stock receiving flow.
- Convert received quantities into base units.
- Increase inventory stock quantity by calculated base-unit quantity on save.
- Create stock batch records.
- Create stock movement records.
- Create or update company payable records from stock receiving.
- Calculate paid amount, due amount, payment status, and payable due date.
- Reverse previous stock and payable effects when editing receiving documents.
- Validate that selected receiving unit belongs to selected product.
- Do not block stock receiving, order approval, sales representative order creation, invoicing, or delivery because of company payable aging; payable aging alerts are handled in finance only.
- Build current stock API.
- Build stock movement API.
- Build low-stock API.
- Build near-expiry and expired product API.
- Build stock adjustment flow.

Deliverables:

- Inventory APIs.
- Product-unit conversion service.
- Stock movement service.

### 5.5 Sales Order Logic and APIs

Tasks:

- Build order creation API for sales representatives.
- Validate assigned company access.
- Validate customer status.
- Validate company-specific credit blocking.
- Validate available stock.
- Calculate product-unit conversion and base-unit quantity.
- Calculate FOC.
- Reserve stock if order submission should reserve stock.
- Build admin approval/rejection API.
- Release stock on rejection.
- Deduct stock on delivery or invoice confirmation.

Deliverables:

- Sales order APIs.
- Order workflow service.
- Stock reservation service.

### 5.6 FOC and Commission Logic

Tasks:

- Build FOC rule CRUD.
- Build FOC calculation service.
- Support quantity-based rules.
- Support value-based rules.
- Support date-limited promotions.
- Build commission rule CRUD.
- Build product commission calculation service.

Deliverables:

- FOC APIs.
- Commission APIs.
- Calculation services.

### 5.7 Invoice, Voucher, and Printing Backend

Tasks:

- Generate invoice from approved order.
- Generate invoice numbers.
- Generate delivery voucher numbers.
- Generate payment receipt numbers.
- Build printable views.
- Build PDF export if required.

Deliverables:

- Invoice APIs.
- Voucher APIs.
- Print/PDF views.

### 5.8 Payment and Credit Control Backend

Tasks:

- Record customer payments.
- Allocate payments to invoices.
- Calculate remaining balances.
- Calculate aging status.
- Update customer company-specific credit status.
- Record company payables from stock receiving.
- Record company payments.
- Generate overdue alerts.

Deliverables:

- Payment APIs.
- Credit control service.
- Accounts receivable APIs.
- Accounts payable APIs.

### 5.9 Dashboard and Reports Backend

Tasks:

- Build dashboard metrics API.
- Build sales reports.
- Build product reports.
- Build customer reports.
- Build sales representative reports.
- Build company reports.
- Build inventory reports.
- Build financial reports.
- Add export support where required.

Deliverables:

- Dashboard APIs.
- Report APIs.

### 5.10 Notifications Backend

Tasks:

- Create in-app notification service.
- Trigger notifications for new orders, approvals, rejections, low stock, near expiry, and overdue payments.
- Build notification list API.
- Build mark-as-read API.

Deliverables:

- Notification APIs.
- Notification service.

---

## Phase 6: Frontend and Backend Integration

Goal: Replace mock data with real APIs.

Tasks:

- Create shared API client.
- Add authentication state.
- Connect office dashboard.
- Connect master data screens.
- Connect inventory screens.
- Connect stock receiving.
- Connect sales order workflow.
- Connect invoice and voucher screens.
- Connect payment and finance screens.
- Connect FOC and commission screens.
- Connect reports.
- Connect sales representative dashboard.
- Connect sales representative product catalog.
- Connect sales representative order creation.
- Connect sales representative order history.
- Replace mock loading with real loading states.
- Replace mock errors with API error handling.

Deliverables:

- Fully integrated office app.
- Fully integrated sales representative app.

---

## Phase 7: Testing and Quality Assurance

Goal: Verify the full system before deployment.

Testing areas:

- Role and permission testing.
- Sales representative company restriction testing.
- Unit conversion testing.
- Stock receiving testing.
- Stock deduction testing.
- Stock reservation testing.
- FOC calculation testing.
- Commission calculation testing.
- Credit blocking testing.
- Invoice balance testing.
- Customer payment allocation testing.
- Company payable testing.
- Dashboard metric testing.
- Report accuracy testing.
- Print layout testing.
- Responsive UI testing.

Deliverables:

- Test checklist.
- Fixed critical bugs.
- UAT-ready system.

---

## Phase 8: Deployment and Handover

Goal: Prepare the system for real usage.

Tasks:

- Configure production `.env`.
- Configure MySQL database.
- Configure local storage folders and permissions.
- Run migrations.
- Run seeders.
- Build frontend assets.
- Configure XAMPP or server virtual host.
- Create admin user.
- Test login and base workflows.
- Prepare user guide.
- Train office users.
- Train sales representatives.

Deliverables:

- Deployed system.
- Admin account.
- User guide.
- Handover checklist.

---

## Suggested Team Responsibilities

Frontend team:

- Office UI screens.
- Sales representative UI screens.
- Shared components.
- Responsive behavior.
- API integration.

Backend team:

- Migrations.
- Models.
- Services.
- APIs.
- Auth and permissions.
- Business rules.

QA team:

- Test cases.
- UI testing.
- Workflow testing.
- Report testing.
- UAT coordination.

Project lead:

- Scope control.
- Screen approval.
- Database approval.
- Sprint planning.
- Final delivery coordination.

---

## Suggested Sprint Plan

### Sprint 1: Foundation and Office Shell

- React/Laravel app structure.
- Shared UI components.
- Office layout.
- Dashboard UI.
- Company UI.
- Product UI.

### Sprint 2: Office Master Data UI

- Unit UI.
- Pharmacy UI.
- Sales representative UI.
- Settings UI.
- UI review round 1.

### Sprint 3: Office Operations UI

- Inventory UI.
- Stock receiving UI.
- Sales order UI.
- Invoice/voucher UI.

### Sprint 4: Finance and Reports UI

- Payment UI.
- Receivables UI.
- Payables UI.
- FOC UI.
- Commission UI.
- Reports UI.
- UI review and freeze.

### Sprint 5: Sales Representative UI

- Sales representative layout.
- Dashboard.
- Product catalog.
- Stock availability.
- Pharmacy list/detail.
- Order creation.
- Order history.
- Performance dashboard.

### Sprint 6: Database and Backend Foundation

- Database migrations.
- Seeders.
- Auth.
- Permissions.
- Master data APIs.

### Sprint 7: Inventory and Sales Backend

- Unit conversion.
- Stock receiving.
- Stock movement.
- Order creation.
- Order approval.
- Stock reservation and deduction.

### Sprint 8: Finance, Reports, and Integration

- Invoice generation.
- Payments.
- Credit control.
- FOC.
- Commission.
- Reports.
- Notifications.
- Frontend API integration.

### Sprint 9: QA, UAT, and Deployment

- Full workflow testing.
- Bug fixing.
- Print testing.
- Production setup.
- User training.
- Handover.
