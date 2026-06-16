export const officeNavSections = [
    {
        label: 'Overview',
        items: [
            ['dashboard', 'grid', 'Dashboard'],
        ],
    },
    {
        label: 'Sales Workflow',
        items: [
            ['pharmacies', 'users', 'Pharmacies'],
            ['orders', 'cart', 'Orders'],
            ['invoices', 'receipt', 'Invoices'],
            ['receivables', 'wallet', 'Receivables'],
            ['payments', 'wallet', 'Payments'],
        ],
    },
    {
        label: 'Warehouse',
        items: [
            ['receiving', 'packageCheck', 'Receiving'],
            ['inventory', 'truck', 'Inventory'],
            ['stock-transfers', 'packageCheck', 'Stock Transfers'],
            ['warehouses', 'building', 'Warehouses'],
        ],
    },
    {
        label: 'Purchasing & Payables',
        items: [
            ['payables', 'building', 'Payables'],
        ],
    },
    {
        label: 'Catalog Setup',
        items: [
            ['products', 'box', 'Products'],
            ['product-categories', 'packageCheck', 'Product Categories'],
            ['units', 'packageCheck', 'Units'],
            ['companies', 'building', 'Companies'],
            ['representatives', 'user', 'Sales Reps'],
        ],
    },
    {
        label: 'Reports',
        items: [
            ['reports-representatives', 'chart', 'Sales Reps'],
            ['reports-pharmacies', 'users', 'Pharmacies'],
            ['reports-finance', 'wallet', 'Finance'],
        ],
    },
    {
        label: 'System',
        items: [
            ['settings', 'settings', 'Settings'],
        ],
    },
];

export const officeNav = officeNavSections.flatMap((section) => section.items);

export const salesNav = [
    ['dashboard', 'grid', 'Dashboard'],
    ['new-order', 'cart', 'New Order'],
    ['pharmacies', 'users', 'Pharmacies'],
    ['orders', 'receipt', 'Order History'],
    ['stock', 'packageCheck', 'Stock'],
];
