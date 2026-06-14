export const officeNavSections = [
    {
        label: 'Overview',
        items: [
            ['dashboard', 'grid', 'Dashboard'],
        ],
    },
    {
        label: 'Master Data',
        items: [
            ['companies', 'building', 'Companies'],
            ['product-categories', 'packageCheck', 'Product Categories'],
            ['products', 'box', 'Products'],
            ['units', 'packageCheck', 'Units'],
            ['pharmacies', 'users', 'Pharmacies'],
            ['representatives', 'user', 'Sales Reps'],
        ],
    },
    {
        label: 'Warehouse',
        items: [
            ['warehouses', 'building', 'Warehouses'],
            ['inventory', 'truck', 'Inventory'],
            ['receiving', 'packageCheck', 'Receiving'],
        ],
    },
    {
        label: 'Sales',
        items: [
            ['orders', 'cart', 'Orders'],
            ['invoices', 'receipt', 'Invoices'],
        ],
    },
    {
        label: 'Finance',
        items: [
            ['payments', 'wallet', 'Payments'],
            ['receivables', 'wallet', 'Receivables'],
            ['payables', 'building', 'Payables'],
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
    ['stock', 'packageCheck', 'Stock'],
    ['pharmacies', 'users', 'Pharmacies'],
    ['new-order', 'cart', 'New Order'],
    ['orders', 'receipt', 'Order History'],
];
