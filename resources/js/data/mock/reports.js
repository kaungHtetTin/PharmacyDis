export const reports = {
    eyebrow: 'Analytics',
    title: 'Reports',
    description: 'Prepare sales, product, customer, sales representative, company, inventory, and financial reports.',
    primaryAction: 'Export report',
    filters: [
        { label: 'Report Type', options: ['All', 'Sales', 'Product', 'Customer', 'Sales Rep', 'Company', 'Inventory', 'Financial'] },
        { label: 'Period', options: ['Today', 'This Month', 'This Year', 'Custom Range'] },
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
    ],
    columns: [
        { key: 'report', label: 'Report' },
        { key: 'period', label: 'Period' },
        { key: 'records', label: 'Records' },
        { key: 'owner', label: 'Owner' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'rpt-001', report: 'Monthly Sales', period: 'June 2026', records: '158 orders', owner: 'Admin', status: 'Ready' },
        { id: 'rpt-002', report: 'Expiry Report', period: 'Next 90 days', records: '23 batches', owner: 'Warehouse', status: 'Ready' },
        { id: 'rpt-003', report: 'Commission Summary', period: 'June 2026', records: '3 companies', owner: 'Finance', status: 'Draft' },
    ],
    formFields: [
        { label: 'Report type', type: 'select', options: ['Sales', 'Product', 'Customer', 'Sales Representative', 'Company', 'Inventory', 'Financial'] },
        { label: 'Start date', type: 'date' },
        { label: 'End date', type: 'date' },
        { label: 'Company', type: 'select', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Export format', type: 'select', options: ['Excel', 'PDF', 'Print Preview'] },
    ],
    reportMetrics: [
        { label: 'Sales total', value: '18.6M', note: 'June 2026' },
        { label: 'Gross receivable', value: '5.2M', note: 'Customer invoices' },
        { label: 'Low stock', value: '11', note: 'Products under threshold' },
    ],
    reportCategories: [
        {
            key: 'sales',
            label: 'Sales',
            filters: ['Date range', 'Company', 'Sales representative', 'Pharmacy'],
            metrics: [
                { label: 'Orders', value: '158', note: 'Submitted and approved' },
                { label: 'Delivered', value: '126', note: 'Completed deliveries' },
            ],
        },
        {
            key: 'product',
            label: 'Product',
            filters: ['Company', 'Brand', 'Category', 'Stock status'],
            metrics: [
                { label: 'Top product', value: 'PCM 500', note: 'By sales amount' },
                { label: 'Slow moving', value: '7', note: 'Needs review' },
            ],
        },
        {
            key: 'customer',
            label: 'Customer',
            filters: ['Pharmacy', 'Credit status', 'Township', 'Sales rep'],
            metrics: [
                { label: 'Active pharmacies', value: '94', note: 'Ordered this month' },
                { label: 'Blocked credit', value: '7', note: 'Company-specific' },
            ],
        },
        {
            key: 'sales-rep',
            label: 'Sales Rep',
            filters: ['Representative', 'Company assignment', 'Order status'],
            metrics: [
                { label: 'Top rep', value: 'May Zin', note: '6.8M sales' },
                { label: 'Commission preview', value: '410K', note: 'Product-based' },
            ],
        },
        {
            key: 'company',
            label: 'Company',
            filters: ['Company', 'Payable status', 'Product category'],
            metrics: [
                { label: 'Company sales', value: '9.4M', note: 'Top company total' },
                { label: 'Payables due', value: '3.8M', note: 'Alert-only finance' },
            ],
        },
        {
            key: 'inventory',
            label: 'Inventory',
            filters: ['Warehouse', 'Batch', 'Expiry range', 'Stock state'],
            metrics: [
                { label: 'Near expiry', value: '23', note: 'Next 90 days' },
                { label: 'Reserved stock', value: '1,140', note: 'Base units' },
            ],
        },
        {
            key: 'financial',
            label: 'Financial',
            filters: ['Receivable aging', 'Payable due date', 'Payment method'],
            metrics: [
                { label: 'Collected', value: '1.2M', note: 'Today' },
                { label: 'Overdue', value: '2.1M', note: 'Critical bucket' },
            ],
        },
    ],
    reportTableColumns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'comparison', label: 'Comparison' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    reportTableRows: [
        { id: 'rt-1', metric: 'Monthly sales', value: '18.6M', comparison: '+12% vs May', status: 'Ready' },
        { id: 'rt-2', metric: 'Receivable overdue', value: '2.1M', comparison: '+4 invoices', status: 'Critical' },
        { id: 'rt-3', metric: 'Expiry alerts', value: '23 batches', comparison: 'Next 90 days', status: 'Warning' },
    ],
    tabs: [
        { key: 'sales', label: 'Sales', lines: ['Daily sales', 'Monthly sales', 'Annual sales'] },
        { key: 'product', label: 'Product', lines: ['Best selling products', 'Slow moving products'] },
        { key: 'finance', label: 'Financial', lines: ['Receivables', 'Payables', 'Collections'] },
    ],
    summaries: [
        { label: 'Reports ready', value: '12', note: 'Export placeholders' },
        { label: 'Inventory alerts', value: '23', note: 'Expiry records' },
        { label: 'Top product', value: 'PCM 500', note: 'June 2026' },
    ],
};
