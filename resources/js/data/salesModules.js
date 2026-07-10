const emptyRows = [];

export const salesModules = {
    stock: {
        eyebrow: 'Availability',
        title: 'Stock',
        description: 'Check available stock by product, sales default unit, and nearest expiry date for the assigned company before creating customer orders.',
        primaryAction: 'Refresh stock',
        searchPlaceholder: 'Search product or SKU',
        pageSize: 15,
        filters: [
            { label: 'Status', options: ['All', 'Available', 'Low Stock', 'Near Expiry'] },
        ],
        columns: [
            { key: 'product', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'available', label: 'Available' },
            { key: 'focOffer', label: 'FOC' },
            { key: 'expiry', label: 'Nearest Expiry' },
            { key: 'status', label: 'Status', type: 'status' },
        ],
        rows: emptyRows,
    },
    pharmacies: {
        eyebrow: 'Customers',
        title: 'Pharmacies',
        description: 'Open a pharmacy detail page to review contact information, purchase history, payment history, outstanding balance, and credit restrictions.',
        detailPageKey: 'pharmacies-detail',
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
        rows: emptyRows,
    },
    'new-order': {
        eyebrow: 'Order Entry',
        title: 'New Order',
        description: 'Start from a pharmacy card, add products from the assigned company, review active FOC offers, enter manual FOC, check credit status, and submit the order.',
        primaryAction: 'Submit order',
        rows: emptyRows,
        salesOrderContext: {},
    },
    orders: {
        eyebrow: 'History',
        title: 'Order History',
        description: 'Track submitted, approved, rejected, delivered, and completed orders with status timelines.',
        primaryAction: 'Create order',
        primaryActionTarget: 'new-order',
        pageSize: 10,
        showDate: true,
        filters: [
            { label: 'Status', options: ['All', 'Submitted', 'Approved', 'Rejected', 'Delivered'] },
        ],
        columns: [
            { key: 'order', label: 'Order' },
            { key: 'pharmacy', label: 'Pharmacy' },
            { key: 'total', label: 'Total', type: 'money' },
            { key: 'submittedDate', label: 'Submitted' },
            { key: 'status', label: 'Status', type: 'status' },
        ],
        rows: emptyRows,
    },
};
