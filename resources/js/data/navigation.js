export const officeNavSections = [
    {
        label: 'Overview',
        items: [
            ['dashboard', 'grid', 'Dashboard', 'office.dashboard'],
        ],
    },
    {
        label: 'Quick Operate',
        items: [
            ['orders', 'cart', 'Orders', 'office.operations'],
            ['invoices', 'receipt', 'Invoices', 'office.operations'],
            ['finance', 'wallet', 'Finance', 'office.finance'],
            ['receiving', 'packageCheck', 'Receiving', 'office.operations'],
            ['inventory', 'truck', 'Inventory', 'office.operations'],
            ['stock-transfers', 'packageCheck', 'Stock Transfers', 'office.operations'],
        ],
    },
    {
        label: 'Customers & Sales',
        items: [
            ['pharmacies', 'users', 'Pharmacies', 'office.master-data'],
            ['representatives', 'user', 'Sales Reps', 'office.master-data'],
        ],
    },
    {
        label: 'Finance Follow-up',
        items: [
            ['receivables', 'wallet', 'Receivables', 'office.finance'],
            ['payments', 'wallet', 'Payments', 'office.finance'],
            ['payables', 'building', 'Payables', 'office.finance'],
        ],
    },
    {
        label: 'Master Data',
        items: [
            ['products', 'box', 'Products', 'office.master-data'],
            ['product-categories', 'packageCheck', 'Product Categories', 'office.master-data'],
            ['units', 'packageCheck', 'Units', 'office.master-data'],
            ['companies', 'building', 'Companies', 'office.master-data'],
            ['warehouses', 'building', 'Warehouses', 'office.master-data'],
            ['finance-categories', 'wallet', 'Financial Categories', 'office.finance'],
        ],
    },
    {
        label: 'Reports',
        items: [
            ['reports-representatives', 'chart', 'Sales Reps', 'office.reports'],
            ['reports-pharmacies', 'users', 'Pharmacies', 'office.reports'],
            ['reports-finance', 'wallet', 'Finance', 'office.reports'],
        ],
    },
    {
        label: 'System',
        items: [
            ['users', 'users', 'Admin Users', 'office.users'],
            ['activity-logs', 'file', 'Activity Logs', 'office.users'],
            ['settings', 'settings', 'Settings', 'office.settings'],
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
