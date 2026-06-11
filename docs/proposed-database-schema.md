# Proposed Database Schema

This schema proposal follows the current office application and sales representative application requirements. It is intended as the backend migration blueprint before API implementation.

## Design Decisions

- Database: MySQL with Laravel migrations.
- Primary keys: `id` as unsigned big integer.
- Foreign keys: `*_id` unsigned big integer with explicit indexes.
- Money fields: `decimal(18,2)`.
- Quantities in selected units: `decimal(14,3)`.
- Quantities in base units: `decimal(18,3)`.
- Percentages: `decimal(5,2)`.
- Status fields: use `varchar(40)` plus Laravel constants instead of hard database enums, so workflow states can evolve.
- Soft deletes: use `deleted_at` on master data and transaction headers where audit history matters.
- Inventory quantities are stored and validated in base units.
- Unit conversion factors belong to `product_units`, not to the unit master table.
- Each sales representative has one assigned company.
- Customer/pharmacy credit blocking is company-specific.
- Company payable aging is alert-only and must not block receiving, order approval, order creation, invoicing, or delivery.
- FOC rules are product-linked; the product is both the eligible product and default reward product for MVP.

## Table Groups

### Authentication and Authorization

#### `roles`

Stores office and sales app roles.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `name` | varchar(100) | Display name |
| `slug` | varchar(100) | Unique, e.g. `admin`, `sales_rep`, `finance` |
| `description` | text nullable | Role purpose |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Unique: `slug`

#### `users`

Stores login accounts for office users and sales representatives.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `role_id` | bigint FK | References `roles.id` |
| `name` | varchar(150) | User display name |
| `email` | varchar(150) nullable | Unique when present |
| `phone` | varchar(50) nullable | Login/contact |
| `password` | varchar(255) | Hashed password |
| `user_type` | varchar(40) | `office`, `sales_representative` |
| `status` | varchar(40) | `active`, `inactive`, `blocked` |
| `last_login_at` | timestamp nullable | Login audit |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `email`
- Index: `role_id`, `phone`, `user_type`, `status`

### Master Data

#### `companies`

Pharmaceutical companies that supply products.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `company_code` | varchar(50) | Unique |
| `name` | varchar(180) | Company name |
| `contact_person` | varchar(150) nullable |  |
| `phone` | varchar(50) nullable |  |
| `email` | varchar(150) nullable |  |
| `address` | text nullable |  |
| `agreement_type` | varchar(80) nullable | Contract type |
| `payment_term_days` | int default 7 | Payable due rule |
| `agreement_note` | text nullable | Agreement details |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `company_code`
- Index: `name`, `status`

#### `product_categories`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `name` | varchar(150) | Unique |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at` | timestamps |  |

#### `brands`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `name` | varchar(150) | Unique |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at` | timestamps |  |

#### `units`

Unit master only. Conversion is product-specific and must not be stored here.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `name` | varchar(100) | e.g. Tablet, Box, Card |
| `short_name` | varchar(30) | e.g. Tab, Box |
| `usage` | varchar(80) nullable | Purchase, sale, stock display |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `name`

#### `products`

Product master with product-level discount, commission, FOC setup state, and primary image.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `company_id` | bigint FK | References `companies.id` |
| `category_id` | bigint FK nullable | References `product_categories.id` |
| `brand_id` | bigint FK nullable | References `brands.id` |
| `base_unit_id` | bigint FK | References `units.id`; duplicated from base `product_units` for fast lookup |
| `product_code` | varchar(80) | Unique |
| `name` | varchar(180) | Product name |
| `barcode` | varchar(120) nullable | Unique when present |
| `primary_image_path` | varchar(255) nullable | Single primary image only |
| `min_stock_base_qty` | decimal(18,3) default 0 | Low-stock threshold in base units |
| `expiry_alert_days` | int default 90 | Near-expiry threshold |
| `discount_percentage` | decimal(5,2) default 0 | Product sales discount |
| `commission_rate` | decimal(5,2) default 0 | Product commission rate |
| `tax_method` | varchar(40) nullable | MVP display field |
| `setup_status` | varchar(40) | `ready`, `needs_review`, `missing_barcode`, etc. |
| `review_note` | text nullable | Setup review note |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `product_code`
- Unique nullable: `barcode`
- Index: `company_id`, `category_id`, `brand_id`, `base_unit_id`, `status`, `setup_status`

#### `product_units`

Selling and receiving units per product.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `product_id` | bigint FK | References `products.id` |
| `unit_id` | bigint FK | References `units.id` |
| `conversion_factor_to_base` | decimal(18,6) | How many base units in one selected unit |
| `selling_price` | decimal(18,2) | Price for this unit |
| `is_base_unit` | boolean | Exactly one base unit per product |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at` | timestamps |  |

Rules:

- Unique pair: `product_id`, `unit_id`.
- Exactly one active `is_base_unit = true` row per product should be enforced in validation/service logic.
- Orders and receiving must validate selected unit through this table.

Indexes:

- Unique: `product_id`, `unit_id`
- Index: `product_id`, `unit_id`, `is_base_unit`, `status`

#### `sales_representatives`

One sales representative is assigned to one company.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `user_id` | bigint FK nullable | References `users.id` for login account |
| `assigned_company_id` | bigint FK | References `companies.id` |
| `employee_code` | varchar(80) | Unique |
| `name` | varchar(150) |  |
| `phone` | varchar(50) nullable |  |
| `email` | varchar(150) nullable |  |
| `region` | varchar(120) nullable | Sales area |
| `product_access_mode` | varchar(40) | `assigned_company` for MVP |
| `assigned_product_note` | text nullable | Optional access note |
| `profile_note` | text nullable | Sales app profile note |
| `status` | varchar(40) | `active`, `inactive`, `blocked` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `employee_code`
- Index: `user_id`, `assigned_company_id`, `region`, `status`

#### `customers`

Pharmacies/customers.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `customer_code` | varchar(80) | Unique |
| `pharmacy_name` | varchar(180) |  |
| `owner_name` | varchar(150) nullable |  |
| `phone` | varchar(50) nullable |  |
| `township` | varchar(120) nullable |  |
| `address` | text nullable |  |
| `credit_limit` | decimal(18,2) default 0 | General credit limit |
| `payment_term_days` | int default 7 | Customer invoice due rule |
| `finance_note` | text nullable | Internal note |
| `status` | varchar(40) | `active`, `warning`, `blocked`, `inactive` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `customer_code`
- Index: `pharmacy_name`, `phone`, `township`, `status`

#### `customer_company_credit_statuses`

Company-specific customer/pharmacy credit state. This is the table that blocks ordering by company.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `customer_id` | bigint FK | References `customers.id` |
| `company_id` | bigint FK | References `companies.id` |
| `status` | varchar(40) | `current`, `warning`, `critical`, `blocked` |
| `outstanding_amount` | decimal(18,2) default 0 | Current outstanding for this company |
| `oldest_due_date` | date nullable | Oldest unpaid invoice due date |
| `block_reason` | text nullable | Reason shown in order form |
| `blocked_at` | timestamp nullable |  |
| `last_calculated_at` | timestamp nullable | Recalculation audit |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Unique: `customer_id`, `company_id`
- Index: `company_id`, `status`, `oldest_due_date`

### Inventory and Stock Receiving

#### `warehouses`

Optional for MVP but useful for future warehouse expansion.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `name` | varchar(150) |  |
| `code` | varchar(50) | Unique |
| `location` | varchar(255) nullable |  |
| `status` | varchar(40) | `active`, `inactive` |
| `created_at`, `updated_at` | timestamps |  |

#### `stock_receipts`

Stock receiving document header.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `receipt_no` | varchar(80) | Unique, e.g. GRN |
| `company_id` | bigint FK | References `companies.id` |
| `warehouse_id` | bigint FK nullable | References `warehouses.id` |
| `company_invoice_no` | varchar(120) nullable | Supplier invoice number |
| `received_date` | date |  |
| `total_base_qty` | decimal(18,3) default 0 | Sum of items in base units |
| `payable_amount` | decimal(18,2) default 0 | Total payable |
| `paid_amount` | decimal(18,2) default 0 | Paid on receiving |
| `due_amount` | decimal(18,2) default 0 | Remaining payable |
| `payment_status` | varchar(40) | `due`, `partial`, `paid` |
| `payable_due_date` | date nullable | Based on company payment term |
| `status` | varchar(40) | `draft`, `completed`, `cancelled` |
| `created_by` | bigint FK nullable | References `users.id` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `receipt_no`
- Index: `company_id`, `warehouse_id`, `received_date`, `payment_status`, `status`

#### `stock_receipt_items`

Received product lines.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `stock_receipt_id` | bigint FK | References `stock_receipts.id` |
| `product_id` | bigint FK | References `products.id` |
| `product_unit_id` | bigint FK | References `product_units.id` |
| `batch_no` | varchar(120) | Batch number |
| `manufacturing_date` | date nullable |  |
| `expiry_date` | date |  |
| `quantity` | decimal(14,3) | Entered selected-unit quantity |
| `conversion_factor_to_base` | decimal(18,6) | Snapshot from product unit |
| `base_quantity` | decimal(18,3) | Quantity converted to base unit |
| `unit_cost` | decimal(18,2) | Cost for selected unit |
| `base_unit_cost` | decimal(18,6) | Derived cost per base unit |
| `selling_price_for_unit` | decimal(18,2) nullable | Optional update/preview |
| `line_total` | decimal(18,2) | Payable line total |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Index: `stock_receipt_id`, `product_id`, `product_unit_id`, `batch_no`, `expiry_date`

#### `stock_batches`

Current batch stock balance. All quantities are base units.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `company_id` | bigint FK | Denormalized from product for filtering |
| `product_id` | bigint FK | References `products.id` |
| `warehouse_id` | bigint FK nullable | References `warehouses.id` |
| `batch_no` | varchar(120) |  |
| `manufacturing_date` | date nullable |  |
| `expiry_date` | date |  |
| `received_base_qty` | decimal(18,3) default 0 | Lifetime received |
| `available_base_qty` | decimal(18,3) default 0 | Sellable stock |
| `reserved_base_qty` | decimal(18,3) default 0 | Reserved for orders |
| `sold_base_qty` | decimal(18,3) default 0 | Sold/deducted |
| `damaged_base_qty` | decimal(18,3) default 0 | Damaged |
| `expired_base_qty` | decimal(18,3) default 0 | Expired |
| `base_unit_cost` | decimal(18,6) nullable | Costing reference |
| `status` | varchar(40) | `available`, `low_stock`, `near_expiry`, `expired`, `reserved` |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Unique candidate: `product_id`, `warehouse_id`, `batch_no`, `expiry_date`
- Index: `company_id`, `product_id`, `expiry_date`, `status`

#### `stock_movements`

Immutable inventory movement ledger.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `stock_batch_id` | bigint FK nullable | References `stock_batches.id` |
| `product_id` | bigint FK | References `products.id` |
| `company_id` | bigint FK | References `companies.id` |
| `warehouse_id` | bigint FK nullable | References `warehouses.id` |
| `movement_type` | varchar(40) | `received`, `reserved`, `released`, `sold`, `adjusted`, `damaged`, `expired`, `reversed` |
| `reference_type` | varchar(80) nullable | e.g. `stock_receipt`, `sales_order`, `invoice` |
| `reference_id` | bigint nullable | Reference row id |
| `quantity_base` | decimal(18,3) | Positive or negative movement |
| `balance_after_base` | decimal(18,3) nullable | Optional audit snapshot |
| `reason` | text nullable | Adjustment reason |
| `created_by` | bigint FK nullable | References `users.id` |
| `created_at` | timestamp | Movement time |

Indexes:

- Index: `product_id`, `company_id`, `stock_batch_id`, `movement_type`, `reference_type`, `reference_id`, `created_at`

#### `stock_adjustments`

Header for manual adjustments.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `adjustment_no` | varchar(80) | Unique |
| `stock_batch_id` | bigint FK | References `stock_batches.id` |
| `product_id` | bigint FK | References `products.id` |
| `product_unit_id` | bigint FK | Selected unit |
| `adjustment_type` | varchar(40) | `increase`, `decrease`, `damage`, `expire` |
| `quantity` | decimal(14,3) | Selected-unit quantity |
| `base_quantity` | decimal(18,3) | Converted base-unit quantity |
| `reason` | text | Required |
| `status` | varchar(40) | `draft`, `posted`, `cancelled` |
| `created_by` | bigint FK nullable | References `users.id` |
| `created_at`, `updated_at` | timestamps |  |

### Sales Orders

#### `sales_orders`

Order header. Office orders can select company; sales app orders use the rep assigned company.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `order_no` | varchar(80) | Unique |
| `customer_id` | bigint FK | References `customers.id` |
| `company_id` | bigint FK | Company being ordered from |
| `sales_representative_id` | bigint FK nullable | References `sales_representatives.id` |
| `requested_delivery_date` | date nullable |  |
| `order_note` | text nullable | Office/warehouse note |
| `credit_status_snapshot` | varchar(40) | Status at submission |
| `credit_blocked` | boolean default false | Whether blocked at attempt/submission |
| `credit_block_reason` | text nullable | Snapshot reason |
| `stock_status` | varchar(40) | `ready`, `warning`, `reserved`, `blocked` |
| `gross_amount` | decimal(18,2) default 0 | Before discount |
| `discount_amount` | decimal(18,2) default 0 | Product discounts |
| `foc_value` | decimal(18,2) default 0 | Value of FOC items |
| `net_amount` | decimal(18,2) default 0 | Payable order amount |
| `total_base_qty` | decimal(18,3) default 0 | Ordered base-unit total |
| `status` | varchar(40) | `draft`, `submitted`, `approved`, `prepared`, `rejected`, `delivered`, `completed`, `cancelled` |
| `submitted_at` | timestamp nullable |  |
| `approved_at` | timestamp nullable |  |
| `rejected_at` | timestamp nullable |  |
| `rejection_reason` | text nullable | Required on rejection |
| `created_by` | bigint FK nullable | User who created |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Rules:

- Sales representative orders must use `sales_representatives.assigned_company_id`.
- Block creation/submission if `customer_company_credit_statuses.status = blocked` for the order company.
- Validate all order item products belong to `sales_orders.company_id`.

Indexes:

- Unique: `order_no`
- Index: `customer_id`, `company_id`, `sales_representative_id`, `status`, `submitted_at`

#### `sales_order_items`

Ordered product lines with selected unit and base-unit snapshot.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `sales_order_id` | bigint FK | References `sales_orders.id` |
| `product_id` | bigint FK | References `products.id` |
| `product_unit_id` | bigint FK | Selected unit |
| `quantity` | decimal(14,3) | Selected-unit quantity |
| `conversion_factor_to_base` | decimal(18,6) | Snapshot |
| `base_quantity` | decimal(18,3) | Converted quantity |
| `unit_price` | decimal(18,2) | Selected-unit price snapshot |
| `gross_line_total` | decimal(18,2) | Quantity x unit price |
| `discount_percentage` | decimal(5,2) default 0 | Product discount snapshot |
| `discount_amount` | decimal(18,2) default 0 |  |
| `net_line_total` | decimal(18,2) | After discount |
| `commission_rate` | decimal(5,2) default 0 | Product commission snapshot |
| `commission_amount` | decimal(18,2) default 0 |  |
| `stock_status` | varchar(40) | `ready`, `reserved`, `blocked`, `low_stock` |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Index: `sales_order_id`, `product_id`, `product_unit_id`

#### `sales_order_foc_items`

FOC items calculated for an order.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `sales_order_id` | bigint FK | References `sales_orders.id` |
| `sales_order_item_id` | bigint FK nullable | Source item |
| `foc_rule_id` | bigint FK nullable | Source rule |
| `product_id` | bigint FK | Reward product; defaults to same product |
| `product_unit_id` | bigint FK | Reward unit |
| `quantity` | decimal(14,3) | Reward selected-unit quantity |
| `base_quantity` | decimal(18,3) | Reward base-unit quantity |
| `estimated_value` | decimal(18,2) default 0 | Reporting value |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Index: `sales_order_id`, `product_id`, `foc_rule_id`

### Product-Linked FOC Rules

#### `foc_rules`

Managed from Product CRUD; no standalone FOC page is required in MVP.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `company_id` | bigint FK | References `companies.id` |
| `product_id` | bigint FK | Eligible product and default reward product |
| `rule_type` | varchar(40) | `quantity`, `value` |
| `buy_quantity` | decimal(14,3) nullable | Quantity rule threshold |
| `buy_product_unit_id` | bigint FK nullable | Unit for quantity rule |
| `spend_amount` | decimal(18,2) nullable | Value rule threshold |
| `get_quantity` | decimal(14,3) | Reward quantity |
| `reward_product_unit_id` | bigint FK | Reward unit; product defaults to same `product_id` |
| `split_foc_enabled` | boolean default false | For proportional FOC |
| `starts_at` | date nullable | Promotion start |
| `ends_at` | date nullable | Promotion end |
| `status` | varchar(40) | `active`, `draft`, `expired`, `inactive` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Index: `company_id`, `product_id`, `rule_type`, `status`, `starts_at`, `ends_at`

### Invoices, Delivery Vouchers, and Payments

#### `invoices`

Generated from approved orders.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `invoice_no` | varchar(80) | Unique |
| `sales_order_id` | bigint FK | References `sales_orders.id` |
| `customer_id` | bigint FK | References `customers.id` |
| `company_id` | bigint FK | References `companies.id` |
| `invoice_date` | date |  |
| `due_date` | date | Based on customer payment term |
| `gross_amount` | decimal(18,2) |  |
| `discount_amount` | decimal(18,2) default 0 |  |
| `foc_value` | decimal(18,2) default 0 |  |
| `net_amount` | decimal(18,2) |  |
| `paid_amount` | decimal(18,2) default 0 |  |
| `due_amount` | decimal(18,2) |  |
| `payment_status` | varchar(40) | `unpaid`, `partial`, `paid` |
| `print_template` | varchar(80) nullable | A4 invoice, delivery voucher, receipt |
| `document_note` | text nullable |  |
| `status` | varchar(40) | `draft`, `printed`, `issued`, `cancelled` |
| `created_by` | bigint FK nullable | References `users.id` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `invoice_no`
- Index: `sales_order_id`, `customer_id`, `company_id`, `due_date`, `payment_status`, `status`

#### `invoice_items`

Snapshot of order items on invoice.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `invoice_id` | bigint FK | References `invoices.id` |
| `sales_order_item_id` | bigint FK nullable | References `sales_order_items.id` |
| `product_id` | bigint FK | References `products.id` |
| `product_unit_id` | bigint FK | Selected unit |
| `quantity` | decimal(14,3) |  |
| `base_quantity` | decimal(18,3) |  |
| `unit_price` | decimal(18,2) |  |
| `discount_amount` | decimal(18,2) default 0 |  |
| `line_total` | decimal(18,2) |  |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Index: `invoice_id`, `product_id`

#### `delivery_vouchers`

Printable delivery document tied to invoice/order.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `voucher_no` | varchar(80) | Unique |
| `invoice_id` | bigint FK nullable | References `invoices.id` |
| `sales_order_id` | bigint FK | References `sales_orders.id` |
| `delivery_date` | date nullable |  |
| `delivered_by` | varchar(150) nullable |  |
| `received_by` | varchar(150) nullable |  |
| `status` | varchar(40) | `draft`, `printed`, `delivered`, `cancelled` |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Unique: `voucher_no`
- Index: `invoice_id`, `sales_order_id`, `status`

#### `payments`

Customer payment header.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `payment_no` | varchar(80) | Unique |
| `customer_id` | bigint FK | References `customers.id` |
| `company_id` | bigint FK nullable | Company context when payment targets one company |
| `received_amount` | decimal(18,2) | Amount received |
| `payment_method` | varchar(40) | `cash`, `bank`, `mobile_pay`, etc. |
| `payment_date` | date |  |
| `allocation_note` | text nullable |  |
| `status` | varchar(40) | `completed`, `partial`, `pending`, `cancelled` |
| `created_by` | bigint FK nullable | References `users.id` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `payment_no`
- Index: `customer_id`, `company_id`, `payment_date`, `status`

#### `payment_allocations`

Allocation of a payment to one or more invoices.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `payment_id` | bigint FK | References `payments.id` |
| `invoice_id` | bigint FK | References `invoices.id` |
| `allocated_amount` | decimal(18,2) |  |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Unique: `payment_id`, `invoice_id`
- Index: `invoice_id`

#### `customer_balances`

Optional summary table for fast finance dashboards. Can be recalculated from invoices/payments.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `customer_id` | bigint FK | References `customers.id` |
| `company_id` | bigint FK | References `companies.id` |
| `current_amount` | decimal(18,2) default 0 | Not overdue |
| `days_1_7_amount` | decimal(18,2) default 0 | Aging bucket |
| `days_8_30_amount` | decimal(18,2) default 0 | Aging bucket |
| `days_31_60_amount` | decimal(18,2) default 0 | Aging bucket |
| `days_60_plus_amount` | decimal(18,2) default 0 | Aging bucket |
| `total_outstanding` | decimal(18,2) default 0 |  |
| `last_calculated_at` | timestamp nullable |  |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Unique: `customer_id`, `company_id`

### Company Payables

#### `company_payables`

Payable created from stock receiving.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `payable_no` | varchar(80) | Unique |
| `company_id` | bigint FK | References `companies.id` |
| `stock_receipt_id` | bigint FK | References `stock_receipts.id` |
| `company_invoice_no` | varchar(120) nullable | Supplier invoice number |
| `payable_amount` | decimal(18,2) |  |
| `paid_amount` | decimal(18,2) default 0 |  |
| `due_amount` | decimal(18,2) |  |
| `due_date` | date |  |
| `payment_status` | varchar(40) | `due`, `partial`, `paid`, `warning`, `critical` |
| `status` | varchar(40) | `open`, `closed`, `cancelled` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `payable_no`
- Index: `company_id`, `stock_receipt_id`, `due_date`, `payment_status`, `status`

#### `company_payments`

Payments made to pharmaceutical companies.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `company_payment_no` | varchar(80) | Unique |
| `company_id` | bigint FK | References `companies.id` |
| `company_payable_id` | bigint FK nullable | References `company_payables.id` |
| `paid_amount` | decimal(18,2) |  |
| `payment_method` | varchar(40) | `cash`, `bank`, etc. |
| `payment_date` | date |  |
| `note` | text nullable |  |
| `status` | varchar(40) | `completed`, `pending`, `cancelled` |
| `created_by` | bigint FK nullable | References `users.id` |
| `created_at`, `updated_at`, `deleted_at` | timestamps | Soft delete |

Indexes:

- Unique: `company_payment_no`
- Index: `company_id`, `company_payable_id`, `payment_date`, `status`

### Notifications, Settings, and Audit

#### `notifications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `user_id` | bigint FK nullable | Target user, nullable for global |
| `type` | varchar(80) | `new_order`, `low_stock`, `overdue_payment`, etc. |
| `title` | varchar(180) |  |
| `message` | text |  |
| `data` | json nullable | Reference ids and metadata |
| `read_at` | timestamp nullable |  |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Index: `user_id`, `type`, `read_at`, `created_at`

#### `settings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `group` | varchar(80) | e.g. `credit`, `storage`, `inventory` |
| `key` | varchar(120) | Setting key |
| `value` | text nullable | Serialized value |
| `value_type` | varchar(40) | `string`, `number`, `boolean`, `json` |
| `updated_by` | bigint FK nullable | References `users.id` |
| `created_at`, `updated_at` | timestamps |  |

Indexes:

- Unique: `group`, `key`

#### `audit_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `user_id` | bigint FK nullable | Actor |
| `action` | varchar(80) | `created`, `updated`, `deleted`, `approved`, etc. |
| `auditable_type` | varchar(150) | Model class/name |
| `auditable_id` | bigint | Row id |
| `old_values` | json nullable | Before |
| `new_values` | json nullable | After |
| `ip_address` | varchar(80) nullable |  |
| `user_agent` | text nullable |  |
| `created_at` | timestamp |  |

Indexes:

- Index: `user_id`, `auditable_type`, `auditable_id`, `action`, `created_at`

### Optional MVP-Later Tables

These tables are useful but can be deferred if implementation time is tight.

#### `expenses`

For finance expense tracking if needed.

#### `sales_commission_summaries`

Can be replaced by reports calculated from `invoice_items` and product commission snapshots for MVP.

#### `number_sequences`

Useful for controlled document numbers (`SO`, `INV`, `PAY`, `GRN`) if simple generated numbers are not enough.

## Key Relationships

```text
companies 1--* products
companies 1--* sales_representatives
products 1--* product_units
products 1--* foc_rules
customers 1--* sales_orders
companies 1--* sales_orders
sales_representatives 1--* sales_orders
sales_orders 1--* sales_order_items
sales_orders 1--* sales_order_foc_items
sales_orders 1--* invoices
invoices 1--* invoice_items
payments 1--* payment_allocations
invoices 1--* payment_allocations
stock_receipts 1--* stock_receipt_items
stock_receipts 1--1 company_payables
products 1--* stock_batches
stock_batches 1--* stock_movements
customers + companies 1--1 customer_company_credit_statuses
```

## Critical Business Constraints

### Product Units

- A product must have at least one `product_units` row.
- A product must have exactly one base unit.
- `product_units.conversion_factor_to_base` must be greater than 0.
- Client-submitted unit prices and conversion factors are previews only; backend must load trusted values from `product_units`.

### Sales Representative Access

- Sales app queries must always filter products and stock by `sales_representatives.assigned_company_id`.
- Sales app order creation must not accept company or sales representative from the client as trusted values.
- The backend should derive `sales_representative_id` from the authenticated user and `company_id` from that representative.

### Company-Specific Customer Credit

- Order creation and approval must check `customer_company_credit_statuses`.
- If status is `blocked`, the order cannot be submitted/approved for that company.
- A customer blocked for one company can still order another company if that company credit status is current or allowed.

### Inventory

- All stock balances must use base-unit quantities.
- Receiving, order reservation, rejection release, invoice/delivery deduction, adjustment, and cancellation must write `stock_movements`.
- Stock update operations should run in database transactions.
- Batch deduction should use a consistent strategy, recommended FEFO: earliest expiry first.

### Stock Receiving and Company Payables

- Completing a stock receipt must:
  - Create or update stock batches.
  - Create stock movement rows.
  - Create or update a company payable.
- Company payable aging must only create alerts and reports; it must not block operational workflows.

### Sales Orders and Invoices

- Sales order items must validate product, selected unit, base quantity, available stock, discount, FOC, and totals server-side.
- Invoice generation should copy order item snapshots into invoice items.
- Payment allocation should update invoice paid/due amounts and then recalculate company-specific customer credit.

## Recommended Migration Order

1. `roles`
2. `users`
3. `companies`
4. `product_categories`
5. `brands`
6. `units`
7. `products`
8. `product_units`
9. `sales_representatives`
10. `customers`
11. `customer_company_credit_statuses`
12. `warehouses`
13. `stock_receipts`
14. `stock_receipt_items`
15. `stock_batches`
16. `stock_movements`
17. `stock_adjustments`
18. `foc_rules`
19. `sales_orders`
20. `sales_order_items`
21. `sales_order_foc_items`
22. `invoices`
23. `invoice_items`
24. `delivery_vouchers`
25. `payments`
26. `payment_allocations`
27. `customer_balances`
28. `company_payables`
29. `company_payments`
30. `notifications`
31. `settings`
32. `audit_logs`

## Seed Data Recommendations

- Roles: Admin, Office Admin, Warehouse Staff, Finance Staff, Sales Representative.
- Companies: at least three active companies.
- Units: Tablet, Card, Box, Capsule, Strip, Bottle, Carton.
- Products: each with one base unit and two selling units.
- Product unit examples:
  - Tablet base, Card = 10 Tablets, Box = 100 Tablets.
  - Bottle base, Carton = 12 Bottles.
- Sales representatives: one active representative per company.
- Customers: active, warning, and blocked examples.
- Customer company credit statuses:
  - Aung Pharmacy + MediLife Co. = blocked.
  - Shwe Clinic Store + MediLife Co. = current.
  - Mandalay Care + MediLife Co. = warning.
- Stock batches: available, low stock, near expiry, and expired examples.
- FOC rules: one quantity-based and one value-based rule.
