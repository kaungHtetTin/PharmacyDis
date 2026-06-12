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

export function unwrapCollection(response) {
    return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
}

export function mapOrders(response) {
    return unwrapCollection(response).map((order) => ({
        id: order.id,
        order: order.order_no,
        pharmacy: order.customer?.name || `Customer #${order.customer_id}`,
        rep: order.sales_representative?.user?.name || `Rep #${order.sales_representative_id || '-'}`,
        company: order.company?.name || `Company #${order.company_id}`,
        submittedDate: order.order_date,
        baseQuantity: `${(order.items || []).reduce((total, item) => total + Number(item.base_unit_quantity || 0), 0)} units`,
        creditStatus: 'Ready',
        stockStatus: order.status === 'approved' ? 'Reserved' : 'Ready',
        total: money(order.total_amount),
        status: titleCase(order.status),
        orderItems: (order.items || []).map((item) => ({
            id: item.id,
            product: item.product?.name || `Product #${item.product_id}`,
            orderedQuantity: item.quantity,
            selectedUnit: item.unit?.name || `Unit #${item.unit_id}`,
            conversion: `1 selected unit = ${item.conversion_factor_to_base} base units`,
            baseQuantity: `${item.base_unit_quantity} base units`,
            unitPrice: money(item.unit_price),
            lineTotal: money(item.line_total),
            stockStatus: 'Ready',
        })),
    }));
}

export function mapInvoices(response) {
    return unwrapCollection(response).map((invoice) => ({
        id: invoice.id,
        invoice: invoice.invoice_no,
        order: invoice.sales_order?.order_no || `SO #${invoice.sales_order_id || '-'}`,
        pharmacy: invoice.customer?.name || `Customer #${invoice.customer_id}`,
        dueDate: invoice.due_date,
        amount: money(invoice.total_amount),
        status: titleCase(invoice.status),
        invoiceItems: invoice.items || [],
    }));
}

export function mapPayments(response) {
    return unwrapCollection(response).map((payment) => ({
        id: payment.id,
        payment: payment.payment_no,
        pharmacy: payment.customer?.name || `Customer #${payment.customer_id}`,
        date: payment.payment_date,
        amount: money(payment.amount),
        method: titleCase(payment.payment_method),
        status: 'Recorded',
    }));
}

export function mapStock(response) {
    return unwrapCollection(response).map((stock) => ({
        id: `${stock.company_id}-${stock.warehouse_id || 0}-${stock.product_id}`,
        product: stock.product?.name || `Product #${stock.product_id}`,
        sku: stock.product?.sku || '-',
        available: stock.available_base_quantity,
        reserved: stock.reserved_base_quantity,
        sold: stock.sold_base_quantity,
        expiry: stock.nearest_expiry_date || '-',
        status: Number(stock.available_base_quantity || 0) > 0 ? 'Available' : 'Low Stock',
    }));
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
    return unwrapCollection(response).map((product) => ({
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
        base_unit_selling_price: product.product_units?.find((unit) => unit.is_base_unit)?.selling_price || 0,
        company: product.company?.name || `Company #${product.company_id}`,
        category: product.category?.name || '-',
        brand: product.brand || '-',
        baseUnit: product.base_unit?.name || '-',
        priceRange: (product.product_units || []).map((unit) => `${money(unit.selling_price)} / ${unit.unit?.name || 'Unit'}`).join(', '),
        baseStock: `${product.low_stock_threshold_base_units || 0} min`,
        commissionRate: `${product.commission_rate_percentage || 0}%`,
        discountRate: `${product.default_discount_percentage || 0}%`,
        focRule: product.foc_rules?.length ? `${product.foc_rules.length} active` : 'No active FOC',
        focStatus: product.foc_rules?.length ? 'Active' : 'Not configured',
        status: titleCase(product.status),
        product_units_raw: (product.product_units || []).map((unit) => ({
            unit_id: unit.unit_id,
            conversion_factor_to_base: unit.conversion_factor_to_base,
            selling_price: unit.selling_price,
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
    }));
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
            company: credit.company?.name || `Company #${credit.company_id}`,
            status: titleCase(credit.credit_status),
            reason: credit.reason || 'No overdue balance',
            outstanding: money(credit.outstanding_balance),
            oldestDue: credit.overdue_days ? `${credit.overdue_days} days overdue` : '-',
        })),
    }));
}

export function mapSalesRepresentatives(response) {
    return unwrapCollection(response).map((rep) => ({
        id: rep.id,
        employee: `${rep.employee_code} / ${rep.user?.name || 'Sales Rep'}`,
        name: rep.user?.name || 'Sales Rep',
        phone: rep.phone || rep.user?.phone || '-',
        region: rep.region || '-',
        companies: rep.company?.name || '-',
        productAccess: 'Assigned company catalog',
        monthlySales: '0',
        orders: '0',
        status: titleCase(rep.status),
        repAssignments: [{
            id: `rep-company-${rep.id}`,
            company: rep.company?.name || '-',
            region: rep.region || '-',
            products: 'Assigned catalog',
            access: 'Full assigned catalog',
            todayOrders: 'Live API',
            status: titleCase(rep.status),
        }],
    }));
}

export function getOfficeEndpoint(pageKey) {
    const endpoints = {
        companies: '/office/companies?per_page=25',
        'product-categories': '/office/product-categories?per_page=25',
        products: '/office/products?per_page=25',
        units: '/office/units?per_page=25',
        pharmacies: '/office/customers?per_page=25',
        representatives: '/lookups/sales-representatives',
        inventory: '/office/stock/current',
        orders: '/office/orders?per_page=25',
        invoices: '/office/invoices?per_page=25',
        payments: '/office/payments?per_page=25',
    };

    return endpoints[pageKey] || '';
}

export function mapOfficeRows(pageKey, response) {
    const mappers = {
        companies: mapCompanies,
        'product-categories': mapProductCategories,
        products: mapProducts,
        units: mapUnits,
        pharmacies: mapCustomers,
        representatives: mapSalesRepresentatives,
        inventory: mapStock,
        orders: mapOrders,
        invoices: mapInvoices,
        payments: mapPayments,
    };

    return mappers[pageKey] ? mappers[pageKey](response) : [];
}

export function getSalesEndpoint(pageKey) {
    const endpoints = {
        orders: '/sales/orders?per_page=25',
        stock: '/lookups/products',
    };

    return endpoints[pageKey] || '';
}

export function mapSalesRows(pageKey, response) {
    if (pageKey === 'orders') {
        return mapOrders(response);
    }

    if (pageKey === 'stock') {
        return mapProducts(response).map((product) => ({
            ...product,
            product: product.name,
            available: product.baseStock,
        }));
    }

    return [];
}

export function applyLiveRows(screen, rows, hasLiveData = true) {
    return { ...screen, rows: hasLiveData ? rows : screen.rows };
}
