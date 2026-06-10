const productCards = [
    {
        id: 'sprd-001',
        imageCode: 'PCM',
        name: 'Paracetamol 500mg',
        company: 'MediLife Co.',
        category: 'Tablet',
        price: 'Tablet 120 / Card 1,200 / Box 12,000',
        stock: '12,000 Tablets available',
        status: 'Available',
        foc: 'FOC: Buy 10 Boxes get 1 Box',
        expiry: 'Nearest expiry: 12 Oct 2026',
    },
    {
        id: 'sprd-002',
        imageCode: 'AMX',
        name: 'Amoxicillin 250mg',
        company: 'Zenith Pharma',
        category: 'Capsule',
        price: 'Capsule 185 / Strip 1,850 / Box 18,500',
        stock: '4,200 Capsules available',
        status: 'Near Expiry',
        foc: 'FOC: Spend 1M get 1 Box',
        expiry: 'Nearest expiry: 03 Aug 2026',
    },
    {
        id: 'sprd-003',
        imageCode: 'CS',
        name: 'Cough Syrup 100ml',
        company: 'Golden Health',
        category: 'Syrup',
        price: 'Bottle 8,900 / Carton 106,800',
        stock: '216 Bottles available',
        status: 'Available',
        foc: 'FOC: No active promotion',
        expiry: 'Nearest expiry: 21 Nov 2026',
    },
];

export const salesProducts = {
    eyebrow: 'Assigned Catalog',
    title: 'Products',
    description: 'Browse assigned company products with price, image, stock availability, and FOC promotion information.',
    primaryAction: 'Start order',
    previewTitle: 'Assigned product catalog',
    searchPlaceholder: 'Search product, company, barcode',
    filters: [
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Category', options: ['All', 'Tablet', 'Capsule', 'Syrup'] },
        { label: 'Status', options: ['All', 'Available', 'Near Expiry', 'Low Stock'] },
    ],
    columns: [
        { key: 'name', label: 'Product' },
        { key: 'barcode', label: 'Barcode' },
        { key: 'company', label: 'Company' },
        { key: 'unitPrices', label: 'Unit Prices' },
        { key: 'stock', label: 'Available' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'sprd-001', name: 'Paracetamol 500mg', barcode: '8850001001012', company: 'MediLife Co.', unitPrices: '120 Tab / 1,200 Card / 12,000 Box', stock: '12,000 Tablets base', status: 'Available', productCards: [productCards[0]] },
        { id: 'sprd-002', name: 'Amoxicillin 250mg', barcode: '8850001002040', company: 'Zenith Pharma', unitPrices: '185 Cap / 1,850 Strip / 18,500 Box', stock: '4,200 Capsules base', status: 'Near Expiry', productCards: [productCards[1]] },
        { id: 'sprd-003', name: 'Cough Syrup 100ml', barcode: '8850001003092', company: 'Golden Health', unitPrices: '8,900 Bottle / 106,800 Carton', stock: '216 Bottles base', status: 'Available', productCards: [productCards[2]] },
    ],
    productCards,
    drawerSections: [
        { title: 'Product detail', items: ['Image placeholder ready', 'Barcode shown for lookup', 'FOC promotion visible', 'Expiry warning shown when needed'] },
        { title: 'Assigned-company rule', items: ['Only products from assigned companies appear here', 'Unassigned company products are excluded from mock data'] },
    ],
};

export const salesStock = {
    eyebrow: 'Availability',
    title: 'Stock',
    description: 'Check available stock by product, batch, unit, and expiry date before creating customer orders.',
    primaryAction: 'Refresh stock',
    previewTitle: 'Stock warnings',
    searchPlaceholder: 'Search product, company, batch',
    filters: [
        { label: 'Status', options: ['All', 'Available', 'Low Stock', 'Near Expiry'] },
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
    ],
    columns: [
        { key: 'product', label: 'Product' },
        { key: 'company', label: 'Company' },
        { key: 'batch', label: 'Batch' },
        { key: 'available', label: 'Available' },
        { key: 'baseQuantity', label: 'Base Qty' },
        { key: 'expiry', label: 'Expiry' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'sstk-001', product: 'Paracetamol 500mg', company: 'MediLife Co.', batch: 'B-2401', available: '120 Boxes', baseQuantity: '12,000 Tablets', expiry: '12 Oct 2026', status: 'Available' },
        { id: 'sstk-002', product: 'Amoxicillin 250mg', company: 'Zenith Pharma', batch: 'B-2407', available: '42 Boxes', baseQuantity: '4,200 Capsules', expiry: '03 Aug 2026', status: 'Near Expiry' },
        { id: 'sstk-003', product: 'Cough Syrup 100ml', company: 'Golden Health', batch: 'B-2411', available: '18 Cartons', baseQuantity: '216 Bottles', expiry: '21 Nov 2026', status: 'Low Stock' },
    ],
    infoCards: [
        { label: 'Low stock', value: '1 item', note: 'Cough Syrup below reorder point' },
        { label: 'Near expiry', value: '1 batch', note: 'Amoxicillin expires in 54 days' },
        { label: 'Base quantity', value: '16,416', note: 'Assigned stock in base units' },
    ],
};

export const salesPharmacies = {
    eyebrow: 'Customers',
    title: 'Pharmacies',
    description: 'View pharmacy contact information, purchase history, outstanding balance, and credit restrictions.',
    primaryAction: 'New order',
    searchPlaceholder: 'Search pharmacy, owner, phone',
    filters: [
        { label: 'Status', options: ['All', 'Active', 'Warning', 'Blocked'] },
        { label: 'Balance', options: ['All', 'Has balance', 'No balance'] },
        { label: 'Company Credit', options: ['All', 'Open', 'Blocked'] },
    ],
    columns: [
        { key: 'name', label: 'Pharmacy' },
        { key: 'owner', label: 'Owner' },
        { key: 'phone', label: 'Phone' },
        { key: 'balance', label: 'Outstanding', type: 'money' },
        { key: 'companyCredit', label: 'Company Credit', type: 'status' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'scus-001', name: 'Aung Pharmacy', owner: 'U Aung', phone: '09 430 000 001', balance: '320,000', companyCredit: 'Blocked', status: 'Blocked' },
        { id: 'scus-002', name: 'Shwe Clinic Store', owner: 'Daw Shwe', phone: '09 430 000 002', balance: '0', companyCredit: 'Ready', status: 'Active' },
        { id: 'scus-003', name: 'Mandalay Care', owner: 'Ko Htet', phone: '09 430 000 003', balance: '85,000', companyCredit: 'Warning', status: 'Warning' },
    ],
    infoCards: [
        { label: 'Blocked customer', value: 'Aung Pharmacy', note: 'Blocked for MediLife Co. only' },
        { label: 'Outstanding', value: '405,000', note: 'Assigned customer balances' },
        { label: 'Clean accounts', value: '1', note: 'No balance customers' },
    ],
    tabs: [
        { key: 'purchase', label: 'Purchase', lines: ['SO-1008 / 420,000 / Submitted', 'SO-1007 / 185,000 / Approved'] },
        { key: 'payments', label: 'Payments', lines: ['PAY-2002 / 90,000 / Cash', 'PAY-2001 / 50,000 / Bank'] },
        { key: 'credit', label: 'Credit', lines: ['MediLife Co.: blocked', 'Zenith Pharma: active', 'Golden Health: warning'] },
    ],
};

export const salesNewOrder = {
    eyebrow: 'Order Entry',
    title: 'New Order',
    description: 'Select a pharmacy, add assigned company products, preview FOC, check credit status, and submit the order.',
    primaryAction: 'Submit order',
    previewTitle: 'Mobile order creation flow',
    filters: [
        { label: 'Step', options: ['All', 'Pharmacy', 'Products', 'Cart', 'Submit'] },
        { label: 'Validation', options: ['All', 'Ready', 'Warning'] },
    ],
    columns: [
        { key: 'step', label: 'Step' },
        { key: 'requirement', label: 'Requirement' },
        { key: 'validation', label: 'Validation' },
        { key: 'value', label: 'Preview' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'ord-step-1', step: '1', requirement: 'Select pharmacy', validation: 'Customer credit checked by company', value: 'Shwe Clinic Store', status: 'Ready' },
        { id: 'ord-step-2', step: '2', requirement: 'Add products', validation: 'Assigned company products only', value: '2 products, unit prices loaded', status: 'Ready' },
        { id: 'ord-step-3', step: '3', requirement: 'Check stock', validation: 'Quantity cannot exceed converted base stock', value: '1,040 base units', status: 'Ready' },
        { id: 'ord-step-4', step: '4', requirement: 'Submit order', validation: 'FOC and credit warning visible', value: 'FOC preview: 1 Box', status: 'Warning' },
    ],
    formFields: [
        { label: 'Pharmacy', type: 'select', options: ['Aung Pharmacy', 'Shwe Clinic Store', 'Mandalay Care'] },
        { label: 'Product', type: 'select', options: ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Cough Syrup 100ml'] },
        { label: 'Quantity', type: 'number', error: 'Cannot exceed available stock after conversion' },
        { label: 'Product unit', type: 'select', options: ['Tablet', 'Card', 'Box', 'Capsule', 'Strip', 'Bottle', 'Carton'] },
        { label: 'Unit price preview' },
        { label: 'Base quantity preview' },
        { label: 'FOC preview' },
        { label: 'Credit warning' },
    ],
    orderBuilder: {
        pharmacies: [
            { name: 'Shwe Clinic Store', owner: 'Daw Shwe', phone: '09 430 000 002', status: 'Ready' },
            { name: 'Aung Pharmacy', owner: 'U Aung', phone: '09 430 000 001', status: 'Blocked' },
        ],
        cart: [
            { product: 'Paracetamol 500mg', quantity: '10', unit: 'Box', baseQuantity: '1,000 Tablets', total: '320,000', stock: 'Ready' },
            { product: 'Amoxicillin 250mg', quantity: '4', unit: 'Card', baseQuantity: '40 Capsules', total: '100,000', stock: 'Ready' },
        ],
        previews: [
            { label: 'Stock check', value: 'Ready', note: '1,040 base units will be reserved after approval' },
            { label: 'FOC preview', value: '1 Box', note: 'Buy 10 Boxes get 1 Box' },
            { label: 'Credit warning', value: 'Open', note: 'Selected pharmacy can order these companies' },
        ],
        submitTitle: 'Submit SO draft for office approval',
        submitNote: 'The sales rep can submit only; office approves, rejects, and reserves stock.',
    },
    drawerSections: [
        { title: 'Cart summary', items: ['2 products selected', '10 Boxes convert to 1,000 Tablets', 'Total: 420,000', 'FOC: 1 Box'] },
        { title: 'UI prevention', items: ['Quantity above available base stock is blocked in the form', 'Unassigned company products never appear in selector'] },
    ],
};

export const salesOrders = {
    eyebrow: 'History',
    title: 'Order History',
    description: 'Track submitted, approved, rejected, delivered, and completed orders with status timelines.',
    primaryAction: 'Create order',
    showDate: true,
    filters: [
        { label: 'Status', options: ['All', 'Submitted', 'Approved', 'Rejected', 'Delivered'] },
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
    ],
    columns: [
        { key: 'order', label: 'Order' },
        { key: 'pharmacy', label: 'Pharmacy' },
        { key: 'total', label: 'Total', type: 'money' },
        { key: 'submitted', label: 'Submitted' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        {
            id: 'sso-1008',
            order: 'SO-1008',
            pharmacy: 'Aung Pharmacy',
            total: '420,000',
            submitted: '10 Jun 2026',
            status: 'Submitted',
            timeline: [
                { label: 'Submitted', note: 'Sent by May Zin at 09:35' },
                { label: 'Waiting approval', note: 'Office approval pending' },
            ],
        },
        {
            id: 'sso-1007',
            order: 'SO-1007',
            pharmacy: 'Shwe Clinic Store',
            total: '185,000',
            submitted: '09 Jun 2026',
            status: 'Approved',
            timeline: [
                { label: 'Submitted', note: 'Sent by May Zin' },
                { label: 'Approved', note: 'Office approved and warehouse reserved stock' },
                { label: 'Preparing', note: 'Warehouse checklist in progress' },
            ],
        },
        {
            id: 'sso-1005',
            order: 'SO-1005',
            pharmacy: 'Aung Pharmacy',
            total: '320,000',
            submitted: '08 Jun 2026',
            status: 'Rejected',
            timeline: [
                { label: 'Submitted', note: 'Sent by May Zin' },
                { label: 'Rejected', note: 'Reason: customer blocked for MediLife Co.' },
            ],
        },
    ],
    drawerSections: [
        { title: 'Order detail', items: ['Items, FOC, total, timeline, and rejection reason appear in this drawer'] },
        { title: 'Rejection reason', items: ['Customer blocked for selected company', 'Sales rep can revise customer or product selection'] },
    ],
};

export const salesPerformance = {
    eyebrow: 'Performance',
    title: 'Performance',
    description: 'Review monthly sales, order count, top products, customer ranking, and commission previews.',
    primaryAction: 'View report',
    filters: [
        { label: 'Period', options: ['This Month', 'Last Month', 'This Year'] },
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
    ],
    columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'thisMonth', label: 'This Month' },
        { key: 'lastMonth', label: 'Last Month' },
        { key: 'change', label: 'Change' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'perf-001', metric: 'Sales', thisMonth: '2.1M', lastMonth: '1.8M', change: '+16%', status: 'Active' },
        { id: 'perf-002', metric: 'Orders', thisMonth: '38', lastMonth: '32', change: '+6', status: 'Active' },
        { id: 'perf-003', metric: 'Commission preview', thisMonth: '210,000', lastMonth: '184,000', change: '+26,000', status: 'Active' },
    ],
    summaries: [
        { label: 'Monthly sales', value: '2.1M', note: '38 orders' },
        { label: 'Top product', value: 'PCM 500', note: '18 orders' },
        { label: 'Top pharmacy', value: 'Aung Pharmacy', note: '420,000' },
        { label: 'Commission preview', value: '210,000', note: 'Product-based estimate' },
    ],
    infoCards: [
        { label: 'Top products sold', value: 'PCM 500, AMX 250', note: 'Ranked by amount' },
        { label: 'Pharmacy ranking', value: 'Aung Pharmacy', note: 'Highest current month customer' },
        { label: 'Order count', value: '38', note: 'Submitted by this representative' },
    ],
};

export const salesModules = {
    products: salesProducts,
    stock: salesStock,
    pharmacies: salesPharmacies,
    'new-order': salesNewOrder,
    orders: salesOrders,
    performance: salesPerformance,
};
