function money(value) {
    return Number(value || 0).toLocaleString();
}

function titleCase(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function storageUrl(path) {
    if (!path) {
        return '';
    }

    if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    const baseUrl = String(window.appConfig?.baseUrl || '').replace(/\/+$/g, '');
    const normalizedPath = String(path).replace(/^\/+/, '').replace(/^storage\//, '');

    return `${baseUrl}/storage/${normalizedPath}`;
}

function dateOnly(value) {
    if (!value) {
        return '';
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/);

    return match ? match[1] : text.slice(0, 10);
}

function defaultSalesProductUnit(product = {}) {
    const units = product?.product_units || [];

    return units.find((unit) => unit.is_default_sales_unit && (unit.status || 'active') === 'active')
        || units.find((unit) => unit.is_base_unit)
        || null;
}

function salesUnitLabel(product = {}) {
    const productUnit = defaultSalesProductUnit(product);

    return productUnit?.unit?.abbreviation
        || productUnit?.unit?.name
        || product.base_unit?.abbreviation
        || product.base_unit?.name
        || 'base units';
}

function salesUnitConversion(product = {}) {
    return Math.max(1, Number(defaultSalesProductUnit(product)?.conversion_factor_to_base || 1));
}

function toSalesUnitQuantity(baseQuantity, product = {}) {
    return Number(baseQuantity || 0) / salesUnitConversion(product);
}

function mapInvoiceItems(items = []) {
    return items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        unit_id: item.unit_id,
        product: item.product?.name || `Product #${item.product_id}`,
        unit: item.unit?.name || `Unit #${item.unit_id}`,
        quantity: Number(item.quantity || 0),
        conversion_factor_to_base: Number(item.conversion_factor_to_base || 1),
        base_unit_quantity: Number(item.base_unit_quantity || 0),
        unit_price: Number(item.unit_price || 0),
        discount_amount: Number(item.discount_amount || 0),
        line_total: Number(item.line_total || 0),
        foc: item.foc_base_unit_quantity || 0,
        total: money(item.line_total),
        status: 'Issued',
    }));
}

function mapInvoicePayments(invoice) {
    return (invoice.payment_records || invoice.allocations || []).map((allocation) => {
        const payment = allocation.payment || {};

        return {
            id: allocation.id,
            payment: payment.payment_no || `Payment #${payment.id || '-'}`,
            date: dateOnly(payment.payment_date) || '-',
            method: titleCase(payment.payment_method || '-'),
            reference: payment.reference_no || '-',
            paymentAmount: money(payment.amount),
            allocatedAmount: money(allocation.allocated_amount),
            status: 'Allocated',
        };
    });
}

export function unwrapCollection(response) {
    return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
}

export function mapOrders(response) {
    return unwrapCollection(response).map((order) => {
        const invoice = order.invoices?.[0] || null;
        const invoiceStatus = titleCase(invoice?.status || '');
        const deliveryStatus = order.status === 'delivered'
            ? 'Delivered'
            : order.status === 'rejected'
                ? 'Rejected'
                : ['approved', 'invoiced'].includes(order.status)
                    ? 'Preparing'
                    : 'Pending';

        return {
            id: order.id,
            company_id: order.company_id,
            customer_id: order.customer_id,
            sales_representative_id: order.sales_representative_id || '',
            invoice_id: invoice?.id || '',
            invoice: invoice?.invoice_no || '',
            invoiceBalance: money(invoice?.balance_amount || 0),
            invoiceStatus,
            paymentStatus: invoiceStatus || 'Not invoiced',
            deliveryStatus,
            status_value: order.status,
            requested_delivery_date: order.requested_delivery_date || '',
            payment_due_date: order.payment_due_date || '',
            tax_amount: Number(order.tax_amount || 0),
            note: order.note || '',
            order: order.order_no,
            pharmacy: order.customer?.name || `Customer #${order.customer_id}`,
            rep: order.sales_representative?.user?.name || `Rep #${order.sales_representative_id || '-'}`,
            company: order.company?.name || `Company #${order.company_id}`,
            submittedDate: dateOnly(order.order_date) || '-',
            requestedDeliveryDate: dateOnly(order.requested_delivery_date) || '-',
            paymentDueDate: dateOnly(order.payment_due_date) || '-',
            baseQuantity: `${(order.items || []).reduce((total, item) => total + Number(item.base_unit_quantity || 0), 0)} units`,
            creditStatus: 'Ready',
            stockStatus: order.status === 'delivered' ? 'Delivered' : ['approved', 'invoiced'].includes(order.status) ? 'Reserved' : 'Ready',
            total: money(order.total_amount),
            status: titleCase(order.status),
            orderItems: (order.items || []).map((item) => ({
                id: item.id,
                product: item.product?.name || `Product #${item.product_id}`,
                company: order.company?.name || `Company #${order.company_id}`,
                orderedQuantity: item.quantity,
                selectedUnit: item.unit?.name || `Unit #${item.unit_id}`,
                conversion: `1 selected unit = ${item.conversion_factor_to_base} base units`,
                baseQuantity: `${item.base_unit_quantity} base units`,
                unitPrice: money(item.unit_price),
                lineTotal: money(item.line_total),
                stockStatus: 'Ready',
            })),
            order_items_raw: (order.items || []).map((item) => ({
                id: item.id,
                product_id: item.product_id,
                unit_id: item.unit_id,
                quantity: item.quantity,
                foc_unit_id: item.foc_unit_id || '',
                foc_quantity: item.foc_quantity || 0,
                discount_percentage: item.discount_percentage || 0,
            })),
            focItems: (order.foc_items || []).map((item) => ({
                id: item.id,
                product: item.product?.name || `Product #${item.product_id}`,
                quantity: `${money(item.reward_base_unit_quantity)} base units`,
                baseQuantity: `${money(item.reward_base_unit_quantity)} base units`,
                rule: item.foc_rule
                    ? item.foc_rule.rule_type === 'value'
                        ? `Minimum order value ${money(item.foc_rule.minimum_order_value || 0)}`
                        : `Minimum ${money(item.foc_rule.minimum_quantity_base_units || 0)} base units`
                    : 'Manual FOC',
            })),
            totals: [
                { label: 'Subtotal', value: money(order.subtotal_amount) },
                { label: 'Discount', value: money(order.discount_amount) },
                { label: 'Tax', value: money(order.tax_amount) },
                { label: 'FOC value', value: money(order.foc_value_amount) },
                { label: 'Total', value: money(order.total_amount) },
            ],
            warehouseChecklist: [
                { id: 'approval', label: 'Order approved', detail: 'Office approval reserves stock for fulfillment.', done: ['approved', 'invoiced', 'delivered'].includes(order.status) },
                { id: 'invoice', label: 'Invoice generated', detail: 'Invoice can be printed after order approval.', done: Boolean(order.invoices?.length) || ['invoiced', 'delivered'].includes(order.status) },
                { id: 'delivery', label: 'Delivery completed', detail: 'Delivered orders are ready for payment follow-up.', done: order.status === 'delivered' },
            ],
        };
    });
}

export function mapInvoices(response) {
    return unwrapCollection(response).map((invoice) => {
        const paymentRecords = mapInvoicePayments(invoice);
        const [sourceOrder] = invoice.sales_order ? mapOrders({ data: [invoice.sales_order] }) : [];

        return {
            id: invoice.id,
            sales_order_id: invoice.sales_order_id || '',
            company_id: invoice.company_id,
            customer_id: invoice.customer_id,
            balance_amount: invoice.balance_amount || 0,
            invoice: invoice.invoice_no,
            order: invoice.sales_order?.order_no || `SO #${invoice.sales_order_id || '-'}`,
            pharmacy: invoice.customer?.name || `Customer #${invoice.customer_id}`,
            company: invoice.company?.name || `Company #${invoice.company_id}`,
            invoice_date: dateOnly(invoice.invoice_date),
            due_date: dateOnly(invoice.due_date),
            invoiceDate: dateOnly(invoice.invoice_date) || '-',
            dueDate: dateOnly(invoice.due_date) || '-',
            sale_type: invoice.sale_type || 'cash',
            saleType: titleCase(invoice.sale_type || 'cash'),
            remark: invoice.remark || '',
            subtotalAmount: money(invoice.subtotal_amount),
            discountAmount: money(invoice.discount_amount),
            taxAmount: money(invoice.tax_amount),
            amount: money(invoice.total_amount),
            paid: money(invoice.paid_amount),
            paidAmount: money(invoice.paid_amount),
            balanceAmount: money(invoice.balance_amount),
            status_value: invoice.status || '',
            status: titleCase(invoice.status),
            invoiceItems: mapInvoiceItems(invoice.items || []),
            totals: [
                { label: 'Subtotal', value: money(invoice.subtotal_amount) },
                { label: 'Discount', value: money(invoice.discount_amount) },
                { label: 'Tax', value: money(invoice.tax_amount) },
                { label: 'Total', value: money(invoice.total_amount) },
            ],
            paymentRecords,
            sourceOrder,
        };
    });
}

export function mapPayments(response) {
    return unwrapCollection(response).map((payment) => {
        const allocations = (payment.allocations || []).map((allocation) => {
            const invoice = allocation.invoice || {};

            return {
                id: allocation.id,
                reference: invoice.invoice_no || `Invoice #${allocation.invoice_id || '-'}`,
                amount: money(invoice.total_amount),
                allocated: money(allocation.allocated_amount),
                balance: money(invoice.balance_amount),
                status: titleCase(invoice.status || 'allocated'),
            };
        });

        return {
            id: payment.id,
            payment: payment.payment_no,
            company: payment.company?.name || `Company #${payment.company_id}`,
            company_id: payment.company_id,
            customer_id: payment.customer_id,
            pharmacy: payment.customer?.name || `Customer #${payment.customer_id}`,
            payment_date: dateOnly(payment.payment_date),
            date: dateOnly(payment.payment_date) || '-',
            amount: money(payment.amount),
            method: titleCase(payment.payment_method),
            referenceNo: payment.reference_no || '-',
            note: payment.note || '',
            status_value: payment.status || 'recorded',
            status: 'Recorded',
            allocations,
        };
    });
}

export function mapSalesReturns(response) {
    return unwrapCollection(response).map((salesReturn) => ({
        id: salesReturn.id,
        returnNo: salesReturn.return_no,
        invoice_id: salesReturn.invoice_id || '',
        invoice: salesReturn.invoice?.invoice_no || `Invoice #${salesReturn.invoice_id || '-'}`,
        order: salesReturn.sales_order?.order_no || `SO #${salesReturn.sales_order_id || '-'}`,
        company_id: salesReturn.company_id || '',
        customer_id: salesReturn.customer_id || '',
        company: salesReturn.company?.name || `Company #${salesReturn.company_id}`,
        pharmacy: salesReturn.customer?.name || `Customer #${salesReturn.customer_id}`,
        warehouse: salesReturn.warehouse?.name || `Warehouse #${salesReturn.warehouse_id}`,
        return_date: dateOnly(salesReturn.return_date),
        returnDate: dateOnly(salesReturn.return_date) || '-',
        returnAmount: money(salesReturn.total_amount),
        return_amount: Number(salesReturn.total_amount || 0),
        paymentAmount: money(salesReturn.payment_amount),
        payment_amount: Number(salesReturn.payment_amount || 0),
        invoiceBalance: money(salesReturn.invoice_balance_amount),
        invoice_balance_amount: Number(salesReturn.invoice_balance_amount || 0),
        items: `${salesReturn.items_count || (salesReturn.items || []).length || 0} items`,
        reason: salesReturn.reason || '-',
        status_value: salesReturn.status || 'posted',
        status: titleCase(salesReturn.status || 'posted'),
    }));
}

export function mapFinanceTransactions(response) {
    return unwrapCollection(response).map((transaction) => ({
        id: transaction.id,
        transaction: transaction.transaction_no,
        direction_value: transaction.direction || 'income',
        direction: titleCase(transaction.direction),
        category_value: transaction.category || 'other',
        category: titleCase(transaction.category),
        date: dateOnly(transaction.transaction_date) || '-',
        transaction_date: dateOnly(transaction.transaction_date),
        amount_value: transaction.amount || 0,
        amount: money(transaction.amount),
        payment_method: transaction.payment_method || 'cash',
        method: titleCase(transaction.payment_method),
        referenceNo: transaction.reference_no || '-',
        reference_no: transaction.reference_no || '',
        description: transaction.description || '',
        source: transaction.source_type ? titleCase(transaction.source_type) : 'Manual',
        status_value: transaction.status || 'recorded',
        status: titleCase(transaction.status || 'recorded'),
    }));
}

export function mapFinanceCategories(response) {
    return unwrapCollection(response).map((category) => ({
        id: category.id,
        name: category.name,
        code: category.code || '',
        direction_value: category.direction || 'both',
        direction: titleCase(category.direction || 'both'),
        description: category.description || '',
        transactionCount: `${category.transactions_count || 0} ${Number(category.transactions_count || 0) === 1 ? 'transaction' : 'transactions'}`,
        status: titleCase(category.status),
    }));
}

export function mapReceivables(response) {
    return unwrapCollection(response).map((invoice) => {
        const dueDate = dateOnly(invoice.due_date);
        const today = new Date().toISOString().slice(0, 10);
        const status = dueDate && dueDate < today && invoice.status !== 'paid'
            ? 'Overdue'
            : titleCase(invoice.status);
        const paymentRecords = mapInvoicePayments(invoice);

        return {
            id: invoice.id,
            sales_order_id: invoice.sales_order_id || '',
            invoice: invoice.invoice_no,
            order: invoice.sales_order?.order_no || '-',
            company_id: invoice.company_id,
            customer_id: invoice.customer_id,
            company: invoice.company?.name || `Company #${invoice.company_id}`,
            pharmacy: invoice.customer?.name || `Customer #${invoice.customer_id}`,
            dueDate: dueDate || '-',
            taxAmount: money(invoice.tax_amount),
            amount: money(invoice.total_amount),
            paid: money(invoice.paid_amount),
            paidAmount: money(invoice.paid_amount),
            balanceAmount: money(invoice.balance_amount),
            balance_amount: invoice.balance_amount || 0,
            status,
            invoiceItems: mapInvoiceItems(invoice.items || []),
            paymentRecords,
            paymentContext: {
                company_id: invoice.company_id,
                customer_id: invoice.customer_id,
                invoice_id: invoice.id,
                invoice_no: invoice.invoice_no,
                balance_amount: invoice.balance_amount || 0,
            },
        };
    });
}

export function mapPayables(response) {
    return unwrapCollection(response).map((payable) => {
        const dueDate = dateOnly(payable.due_date);
        const today = new Date().toISOString().slice(0, 10);
        const status = dueDate && dueDate < today && payable.status !== 'paid'
            ? 'Overdue'
            : titleCase(payable.status);
        const paymentTransactions = (payable.payments || []).map((payment) => ({
            id: payment.id,
            payment: payment.payment_no || `Payment #${payment.id}`,
            date: dateOnly(payment.payment_date) || '-',
            amount: money(payment.amount),
            method: titleCase(payment.payment_method || '-'),
            reference: payment.reference_no || '-',
            note: payment.note || '',
            status: 'Recorded',
        }));

        return {
            id: payable.id,
            payable: `PAYABLE-${String(payable.id).padStart(4, '0')}`,
            company_id: payable.company_id,
            stock_receipt_id: payable.stock_receipt_id,
            company: payable.company?.name || `Company #${payable.company_id}`,
            receipt: payable.stock_receipt?.receipt_no || '-',
            supplierInvoice: payable.stock_receipt?.supplier_invoice_no || '-',
            payableDate: dateOnly(payable.payable_date) || '-',
            dueDate: dueDate || '-',
            amount: money(payable.amount),
            paidAmount: money(payable.paid_amount),
            balanceAmount: money(payable.balance_amount),
            balance_amount: payable.balance_amount || 0,
            status,
            paymentTransactions,
        };
    });
}

export function mapStockReceipts(response) {
    return unwrapCollection(response).map((receipt) => {
        const items = receipt.items || [];
        const baseQuantity = items.reduce((total, item) => total + Number(item.base_unit_quantity || 0), 0);
        const receivedDate = dateOnly(receipt.received_date);
        const payableDueDate = dateOnly(receipt.payable_due_date);
        const payable = receipt.payable || {};
        const paidAmount = payable.paid_amount ?? receipt.paid_amount ?? 0;
        const dueAmount = payable.balance_amount ?? receipt.due_amount ?? 0;
        const dueDate = dateOnly(payable.due_date) || payableDueDate;
        const today = new Date().toISOString().slice(0, 10);
        const paymentStatus = dueDate && dueDate < today && Number(dueAmount || 0) > 0
            ? 'Overdue'
            : titleCase(payable.status || receipt.payment_status);

        return {
            id: receipt.id,
            receipt: receipt.receipt_no,
            invoice: receipt.supplier_invoice_no || '-',
            company_id: receipt.company_id,
            warehouse_id: receipt.warehouse_id || '',
            supplier_invoice_no: receipt.supplier_invoice_no || '',
            received_date: receivedDate,
            payable_due_date: payableDueDate,
            discount_amount: receipt.discount_amount || 0,
            paid_amount: receipt.paid_amount || 0,
            company: receipt.company?.name || `Company #${receipt.company_id}`,
            warehouse: receipt.warehouse?.name || '-',
            items: `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
            baseQuantity: `${money(baseQuantity)} base units`,
            payable: money(receipt.total_amount),
            paidAmount: money(paidAmount),
            dueAmount: money(dueAmount),
            dueDate: dueDate || '-',
            payment_status_value: payable.status || receipt.payment_status || '',
            paymentStatus,
            receivedDate: receivedDate || '-',
            status_value: receipt.status || '',
            status: receipt.status === 'posted' ? 'Completed' : titleCase(receipt.status),
            receivingItems: items.map((item) => ({
                id: item.id,
                product_id: item.product_id,
                unit_id: item.unit_id,
                foc_unit_id: item.foc_unit_id || '',
                product: item.product?.name || `Product #${item.product_id}`,
                batch: item.batch_no || '-',
                batch_no: item.batch_no || '',
                quantity: item.quantity,
                focQuantity: item.foc_quantity || 0,
                focUnit: item.foc_unit?.name || '-',
                unit: item.unit?.name || `Unit #${item.unit_id}`,
                baseQuantity: `${money(item.base_unit_quantity)} ${item.product?.base_unit?.name || 'base units'}`,
                unitCost: money(item.unit_cost),
                unit_cost: item.unit_cost || 0,
                commission: `${item.commission_rate_percentage || 0}% / ${money(item.commission_amount)}`,
                commission_amount: item.commission_amount || 0,
                commission_rate_percentage: item.commission_rate_percentage || 0,
                manufactured_date: dateOnly(item.manufactured_date),
                expiry_date: dateOnly(item.expiry_date),
            })),
            receipt_items_raw: items.map((item) => ({
                product_id: item.product_id,
                unit_id: item.unit_id,
                foc_unit_id: item.foc_unit_id || '',
                quantity: item.quantity,
                foc_quantity: item.foc_quantity || 0,
                unit_cost: item.unit_cost,
                batch_no: item.batch_no || '',
                manufactured_date: dateOnly(item.manufactured_date),
                expiry_date: dateOnly(item.expiry_date),
            })),
            payablePreview: {
                total: money(receipt.total_amount),
                paid: money(paidAmount),
                due: money(dueAmount),
                dueDate: dueDate || '-',
            },
            printItems: [
                { label: 'Receipt', value: receipt.receipt_no },
                { label: 'Company', value: receipt.company?.name || `Company #${receipt.company_id}` },
                { label: 'Invoice', value: receipt.supplier_invoice_no || '-' },
                { label: 'Items', value: `${items.length} items / ${money(baseQuantity)} base units` },
                { label: 'Payable due', value: money(dueAmount) },
            ],
        };
    });
}

export function mapStock(response) {
    return unwrapCollection(response).map((stock) => {
        const available = Number(stock.available_base_quantity || 0);
        const threshold = Number(stock.product?.low_stock_threshold_base_units || 0);
        const availableSalesQuantity = toSalesUnitQuantity(available, stock.product);
        const expiry = dateOnly(stock.nearest_expiry_date);
        const today = new Date().toISOString().slice(0, 10);
        const nearExpiryLimit = new Date();
        nearExpiryLimit.setDate(nearExpiryLimit.getDate() + 90);
        const nearExpiryDate = nearExpiryLimit.toISOString().slice(0, 10);
        const status = expiry && expiry < today
            ? 'Expired'
            : expiry && expiry <= nearExpiryDate
                ? 'Near Expiry'
                : available <= threshold
                    ? 'Low Stock'
                    : 'Available';
        const unit = salesUnitLabel(stock.product);
        const focRules = stock.product?.foc_rules || [];
        const hasActiveFoc = focRules.length > 0;

        return {
            id: `${stock.company_id}-${stock.warehouse_id || 0}-${stock.product_id}`,
            company_id: stock.company_id,
            product: stock.product?.name || `Product #${stock.product_id}`,
            product_id: stock.product_id,
            sku: stock.product?.sku || '-',
            available: `${money(availableSalesQuantity)} ${unit}`,
            expiry: expiry || '-',
            focOffer: hasActiveFoc ? `${focRules.length} active` : '-',
            focRules: focRules.map((rule) => ({
                id: rule.id,
                title: rule.rule_type === 'value' ? 'Order value FOC' : 'Quantity FOC',
                condition: rule.rule_type === 'value'
                    ? `Minimum order value ${money(rule.minimum_order_value || 0)}`
                    : `Minimum ${money(rule.minimum_quantity_base_units || 0)} base units`,
                reward: `${money(rule.reward_quantity_base_units || 0)} base units free`,
                validity: [rule.starts_at, rule.ends_at].filter(Boolean).length
                    ? `${dateOnly(rule.starts_at) || 'Any start'} to ${dateOnly(rule.ends_at) || 'No end'}`
                    : 'Open-ended',
                status: titleCase(rule.status || 'active'),
            })),
            hasActiveFoc,
            rowClassName: '',
            status,
            stockValue: money(stock.stock_value_amount || 0),
            warehouse_id: stock.warehouse_id || '',
        };
    });
}

export function mapStockBatches(response) {
    return unwrapCollection(response).map((batch) => {
        const available = Number(batch.available_base_quantity || 0);
        const reserved = Number(batch.reserved_base_quantity || 0);
        const sold = Number(batch.sold_base_quantity || 0);
        const damaged = Number(batch.damaged_base_quantity || 0);
        const expiredQuantity = Number(batch.expired_base_quantity || 0);
        const expiry = dateOnly(batch.expiry_date);
        const today = new Date().toISOString().slice(0, 10);
        const nearExpiryLimit = new Date();
        nearExpiryLimit.setDate(nearExpiryLimit.getDate() + 90);
        const nearExpiryDate = nearExpiryLimit.toISOString().slice(0, 10);
        const unit = batch.product?.base_unit?.abbreviation || batch.product?.base_unit?.name || response?.product?.base_unit?.abbreviation || response?.product?.base_unit?.name || 'base units';
        const status = expiredQuantity > 0 || (expiry && expiry < today)
            ? 'Expired'
            : expiry && expiry <= nearExpiryDate
                ? 'Near Expiry'
                : available > 0
                    ? 'Available'
                    : reserved > 0
                        ? 'Reserved'
                        : 'Completed';

        return {
            id: batch.id,
            batch: batch.batch_no || `Batch #${batch.id}`,
            batch_no: batch.batch_no || '',
            company_id: batch.company_id || response?.product?.company_id || '',
            product: batch.product?.name || response?.product?.name || `Product #${batch.product_id || response?.product?.id || '-'}`,
            product_id: batch.product_id || response?.product?.id || '',
            warehouse: batch.warehouse?.name || '-',
            warehouse_id: batch.warehouse_id || '',
            received: `${money(batch.received_base_quantity)} ${unit}`,
            available: `${money(available)} ${unit}`,
            baseUnitCost: money(batch.base_unit_cost_amount || 0),
            stockValue: money(batch.stock_value_amount || 0),
            reserved: `${money(reserved)} ${unit}`,
            sold: `${money(sold)} ${unit}`,
            damaged: `${money(damaged)} ${unit}`,
            expiredQuantity: `${money(expiredQuantity)} ${unit}`,
            expiry: expiry || '-',
            status,
        };
    });
}

export function mapStockTransfers(response) {
    return unwrapCollection(response).map((transfer) => {
        const outboundMovements = (transfer.movements || []).filter((movement) => Number(movement.base_unit_quantity || 0) < 0);
        const productNames = [...new Set(outboundMovements.map((movement) => movement.product?.name || `Product #${movement.product_id || '-'}`))];
        const baseQuantity = outboundMovements.reduce((sum, movement) => sum + Math.abs(Number(movement.base_unit_quantity || 0)), 0);
        const sourceWarehouse = transfer.source_warehouse?.name || '-';
        const destinationWarehouse = transfer.destination_warehouse?.name || '-';
        const lineSummary = outboundMovements
            .slice(0, 3)
            .map((movement) => {
                const unit = movement.product?.base_unit?.abbreviation || movement.product?.base_unit?.name || 'base units';
                const batch = movement.stock_batch?.batch_no || `Batch #${movement.stock_batch_id}`;

                return `${movement.product?.name || 'Product'} / ${batch} / ${money(Math.abs(Number(movement.base_unit_quantity || 0)))} ${unit}`;
            })
            .join(', ');

        return {
            id: transfer.id,
            transfer: transfer.transfer_no || `Transfer #${transfer.id}`,
            route: `${sourceWarehouse} -> ${destinationWarehouse}`,
            company: transfer.company?.name || '-',
            sourceWarehouse,
            destinationWarehouse,
            products: productNames.length > 0 ? productNames.join(', ') : '-',
            baseQuantity: money(baseQuantity),
            date: dateOnly(transfer.created_at),
            note: transfer.note || '',
            lineSummary: lineSummary || '-',
            lineCount: outboundMovements.length,
            transferItems: outboundMovements.map((movement) => {
                const unit = movement.product?.base_unit?.abbreviation || movement.product?.base_unit?.name || 'base units';

                return {
                    id: movement.id,
                    product: movement.product?.name || `Product #${movement.product_id || '-'}`,
                    batch: movement.stock_batch?.batch_no || `Batch #${movement.stock_batch_id || '-'}`,
                    expiry: dateOnly(movement.stock_batch?.expiry_date) || '-',
                    sourceWarehouse: movement.warehouse?.name || sourceWarehouse,
                    destinationWarehouse,
                    quantity: `${money(Math.abs(Number(movement.base_unit_quantity || 0)))} ${unit}`,
                    note: movement.note || '-',
                };
            }),
            status: 'Completed',
        };
    });
}

export function mapCompanies(response) {
    return unwrapCollection(response).map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code,
        contact_person: company.contact_person || '',
        phone: company.phone || '-',
        email: company.email || '-',
        address: company.address || '',
        contact: [company.contact_person, company.phone].filter(Boolean).join(' / ') || '-',
        products: `${company.products_count || 0} products`,
        status: titleCase(company.status),
    }));
}

export function mapProducts(response) {
    return unwrapCollection(response).map((product) => {
        const lowStockSalesUnits = toSalesUnitQuantity(product.low_stock_threshold_base_units || 0, product);
        const lowStockUnit = salesUnitLabel(product);

        return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode || '-',
            barcode_value: product.barcode || '',
            company_id: product.company_id,
            product_category_id: product.product_category_id || '',
            brand_value: product.brand || '',
            base_unit_id: product.base_unit_id,
            description: product.description || '',
            primary_image_path: product.primary_image_path || '',
            imageUrl: storageUrl(product.primary_image_path),
            default_discount_percentage: product.default_discount_percentage || 0,
            commission_rate_percentage: product.commission_rate_percentage || 0,
            low_stock_threshold_base_units: product.low_stock_threshold_base_units || 0,
            low_stock_threshold_sales_units: lowStockSalesUnits,
            low_stock_threshold_sales_unit: lowStockUnit,
            base_unit_selling_price: product.product_units?.find((unit) => unit.is_base_unit)?.selling_price || 0,
            company: product.company?.name || `Company #${product.company_id}`,
            category: product.category?.name || '-',
            brand: product.brand || '-',
            baseUnit: product.base_unit?.name || '-',
            priceRange: (product.product_units || []).map((unit) => `${money(unit.selling_price)} / ${unit.unit?.name || 'Unit'}`).join(', '),
            baseStock: `${money(lowStockSalesUnits)} ${lowStockUnit} min`,
            commissionRate: `${product.commission_rate_percentage || 0}%`,
            discountRate: `${product.default_discount_percentage || 0}%`,
            focRule: product.foc_rules?.length ? `${product.foc_rules.length} active` : 'No active FOC',
            focStatus: product.foc_rules?.length ? 'Active' : 'Not configured',
            status: product.deleted_at ? 'Deleted' : titleCase(product.status),
            status_value: product.deleted_at ? 'deleted' : product.status,
            deleted_at: product.deleted_at || '',
            isDeleted: Boolean(product.deleted_at),
            foc_rules_raw: product.foc_rules || [],
            focRules: (product.foc_rules || []).map((rule) => ({
                id: rule.id,
                title: rule.rule_type === 'value' ? 'Order value FOC' : 'Quantity FOC',
                type: titleCase(rule.rule_type || 'quantity'),
                status: titleCase(rule.status || 'active'),
                condition: rule.rule_type === 'value'
                    ? `Minimum order value ${money(rule.minimum_order_value || 0)}`
                    : `Minimum ${rule.minimum_quantity_base_units || 0} base units`,
                reward: `${rule.reward_quantity_base_units || 0} base units free`,
                validity: [rule.starts_at, rule.ends_at].filter(Boolean).length
                    ? `${rule.starts_at || 'Any start'} to ${rule.ends_at || 'No end'}`
                    : '',
            })),
            product_units_raw: (product.product_units || []).map((unit) => ({
                unit_id: unit.unit_id,
                unit_name: unit.unit?.name || '',
                unit_abbreviation: unit.unit?.abbreviation || '',
                conversion_factor_to_base: unit.conversion_factor_to_base,
                selling_price: unit.selling_price,
                is_base_unit: Boolean(unit.is_base_unit),
                is_default_sales_unit: Boolean(unit.is_default_sales_unit),
                status: unit.status || 'active',
            })),
            productUnits: (product.product_units || []).map((unit) => ({
                id: unit.id,
                unitId: unit.unit_id,
                unit: unit.unit?.name || `Unit #${unit.unit_id}`,
                shortName: unit.unit?.abbreviation || '-',
                conversion: unit.conversion_factor_to_base,
                conversionLabel: unit.is_base_unit ? 'Base stock unit' : `1 ${unit.unit?.name || 'unit'} = ${unit.conversion_factor_to_base} base units`,
                price: money(unit.selling_price),
                isBase: Boolean(unit.is_base_unit),
                isDefaultSalesUnit: Boolean(unit.is_default_sales_unit),
                status: titleCase(unit.status || 'active'),
            })),
        };
    });
}

export function mapProductCategories(response) {
    return unwrapCollection(response).map((category) => ({
        id: category.id,
        name: category.name,
        code: category.code || '',
        parent_id: category.parent_id || '',
        parent: category.parent?.name || '-',
        products: `${category.products_count || 0} ${Number(category.products_count || 0) === 1 ? 'product' : 'products'}`,
        status: titleCase(category.status),
    }));
}

export function mapUnits(response) {
    return unwrapCollection(response).map((unit) => ({
        id: unit.id,
        name: unit.name,
        abbreviation: unit.abbreviation || '',
        shortName: unit.abbreviation || '-',
        usage: Number(unit.product_units_count || 0) > 0 ? 'Used in products' : 'Unused',
        productCount: `${unit.product_units_count || 0} ${Number(unit.product_units_count || 0) === 1 ? 'product row' : 'product rows'}`,
        example: Number(unit.product_units_count || 0) > 0 ? 'Configured in Product CRUD' : 'Ready for product setup',
        status: titleCase(unit.status),
    }));
}

export function mapWarehouses(response) {
    return unwrapCollection(response).map((warehouse) => ({
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code || '',
        address_value: warehouse.address || '',
        address: warehouse.address || '-',
        stockBatchCount: `${warehouse.stock_batches_count || 0} ${Number(warehouse.stock_batches_count || 0) === 1 ? 'batch' : 'batches'}`,
        receiptCount: `${warehouse.stock_receipts_count || 0} ${Number(warehouse.stock_receipts_count || 0) === 1 ? 'receipt' : 'receipts'}`,
        status: titleCase(warehouse.status),
    }));
}

export function mapCustomers(response) {
    return unwrapCollection(response).map((customer) => ({
        id: customer.id,
        name: customer.name,
        code: customer.code || '',
        owner_name: customer.owner_name || '',
        owner: customer.owner_name || '-',
        phone_value: customer.phone || '',
        phone: customer.phone || '-',
        email: customer.email || '',
        township_value: customer.township || '',
        township: customer.township || customer.city || '-',
        city: customer.city || '',
        region: customer.region || '',
        outstanding: money(customer.credit_statuses?.[0]?.outstanding_balance || 0),
        creditStatus: titleCase(customer.credit_statuses?.[0]?.credit_status || 'active'),
        status: titleCase(customer.status),
        address: customer.address || '',
        creditStatuses: (customer.credit_statuses || []).map((credit) => ({
            company_id: credit.company_id,
            company: credit.company?.name || `Company #${credit.company_id}`,
            status: titleCase(credit.credit_status),
            credit_status: credit.credit_status,
            reason: credit.reason || 'No overdue balance',
            outstanding_balance: credit.outstanding_balance || 0,
            outstanding: money(credit.outstanding_balance),
            oldestDue: credit.overdue_days ? `${credit.overdue_days} days overdue` : '-',
        })),
    }));
}

export function mapSalesRepresentatives(response) {
    return unwrapCollection(response).map((rep) => ({
        id: rep.id,
        user_id: rep.user_id,
        company_id: rep.company_id,
        employee_code: rep.employee_code || '',
        employee: `${rep.employee_code || 'Auto'} / ${rep.user?.name || 'Sales Rep'}`,
        name: rep.user?.name || 'Sales Rep',
        email: rep.user?.email || '',
        phone_value: rep.phone || rep.user?.phone || '',
        phone: rep.phone || rep.user?.phone || '-',
        region: rep.region || '-',
        region_value: rep.region || '',
        companies: rep.company?.name || '-',
        joined_at: rep.joined_at || '',
        joined: rep.joined_at || '-',
        status: titleCase(rep.status),
    }));
}

export function getOfficeEndpoint(pageKey) {
    const endpoints = {
        companies: '/office/companies?per_page=25',
        'product-categories': '/office/product-categories?per_page=25',
        products: '/office/products?per_page=25',
        units: '/office/units?per_page=25',
        warehouses: '/office/warehouses?per_page=15',
        pharmacies: '/office/customers?per_page=25',
        representatives: '/office/sales-representatives?per_page=15',
        receiving: '/office/stock-receipts?per_page=15',
        inventory: '/office/stock/current',
        'stock-transfers': '/office/stock/transfers?per_page=15',
        'stock-transfer-create': '',
        'inventory-detail': '',
        orders: '/office/orders?per_page=25',
        invoices: '/office/invoices?per_page=25',
        finance: '/office/finance/transactions?per_page=15',
        'finance-categories': '/office/finance-categories?per_page=15',
        payments: '/office/payments?per_page=25',
        'sales-returns': '/office/sales-returns?per_page=25',
        receivables: '/office/receivables?per_page=15',
        payables: '/office/payables?per_page=15',
    };

    return endpoints[pageKey] || '';
}

export function mapOfficeRows(pageKey, response) {
    const mappers = {
        companies: mapCompanies,
        'product-categories': mapProductCategories,
        products: mapProducts,
        units: mapUnits,
        warehouses: mapWarehouses,
        pharmacies: mapCustomers,
        representatives: mapSalesRepresentatives,
        receiving: mapStockReceipts,
        inventory: mapStock,
        'stock-transfers': mapStockTransfers,
        'inventory-detail': mapStockBatches,
        orders: mapOrders,
        invoices: mapInvoices,
        finance: mapFinanceTransactions,
        'finance-categories': mapFinanceCategories,
        payments: mapPayments,
        'sales-returns': mapSalesReturns,
        receivables: mapReceivables,
        payables: mapPayables,
    };

    return mappers[pageKey] ? mappers[pageKey](response) : [];
}

export function getSalesEndpoint(pageKey) {
    const endpoints = {
        orders: '/sales/orders?per_page=25',
        pharmacies: '/lookups/customers',
        stock: '/sales/stock/current',
    };

    return endpoints[pageKey] || '';
}

export function mapSalesRows(pageKey, response) {
    if (pageKey === 'orders') {
        return mapOrders(response);
    }

    if (pageKey === 'pharmacies') {
        return mapCustomers(response).map((customer) => ({
            ...customer,
            balance: customer.outstanding,
            companyCredit: customer.creditStatus,
        }));
    }

    if (pageKey === 'stock') {
        return mapStock(response);
    }

    return [];
}

export function applyLiveRows(screen, rows, hasLiveData = true) {
    return { ...screen, rows: hasLiveData ? rows : screen.rows };
}
