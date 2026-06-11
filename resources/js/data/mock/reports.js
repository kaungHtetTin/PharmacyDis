const baseReportFields = [
    { label: 'Start date', type: 'date' },
    { label: 'End date', type: 'date' },
    { label: 'Export format', type: 'select', options: ['Excel', 'PDF', 'Print Preview'] },
];

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

export const representativeReports = {
    eyebrow: 'Reports',
    title: 'Sales Representative Reports',
    description: 'Review sales representative performance, order count, product-based commission preview, assigned company, and customer coverage.',
    primaryAction: 'Export report',
    filters: [
        { label: 'Representative', options: ['All', 'May Zin', 'Ko Htet', 'Nilar'] },
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Period', options: ['Today', 'This Month', 'This Year', 'Custom Range'] },
    ],
    columns: [
        { key: 'representative', label: 'Sales Rep' },
        { key: 'company', label: 'Company' },
        { key: 'orders', label: 'Orders' },
        { key: 'sales', label: 'Sales', type: 'money' },
        { key: 'commission', label: 'Commission Preview', type: 'money' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'rr-1', representative: 'May Zin', company: 'MediLife Co.', orders: '38', sales: '2.1M', commission: '210,000', status: 'Ready' },
        { id: 'rr-2', representative: 'Ko Htet', company: 'Zenith Pharma', orders: '31', sales: '1.6M', commission: '154,000', status: 'Ready' },
        { id: 'rr-3', representative: 'Nilar', company: 'Golden Health', orders: '22', sales: '1.1M', commission: '94,000', status: 'Draft' },
    ],
    formFields: [
        { label: 'Sales representative', type: 'select', options: ['All', 'May Zin', 'Ko Htet', 'Nilar'] },
        { label: 'Company', type: 'select', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        ...baseReportFields,
    ],
    reportMetrics: [
        { label: 'Total sales', value: '4.8M', note: 'Active sales reps' },
        { label: 'Orders', value: '91', note: 'Submitted this month' },
        { label: 'Commission preview', value: '458,000', note: 'Product-based estimate' },
    ],
    reportChart: {
        eyebrow: 'Performance chart',
        title: 'Sales by representative',
        type: 'bar',
        series: [
            { label: 'May Zin', value: '2.1M', percent: 100, note: '38 orders / 210K commission' },
            { label: 'Ko Htet', value: '1.6M', percent: 76, note: '31 orders / 154K commission' },
            { label: 'Nilar', value: '1.1M', percent: 52, note: '22 orders / 94K commission' },
        ],
    },
    reportSummary: [
        { label: 'Best performer', value: 'May Zin', note: 'Highest sales and order count' },
        { label: 'Average order value', value: '52,747', note: '91 orders across active reps' },
        { label: 'Commission basis', value: 'Product rate', note: 'Calculated from product commission field' },
        { label: 'Follow-up needed', value: '1 rejected', note: 'Customer credit block reason' },
    ],
    reportCategories: [
        {
            key: 'performance',
            label: 'Performance',
            filters: ['Representative', 'Company assignment', 'Date range'],
            metrics: [
                { label: 'Top rep', value: 'May Zin', note: '2.1M monthly sales' },
                { label: 'Best product', value: 'PCM 500', note: '18 orders' },
            ],
        },
        {
            key: 'coverage',
            label: 'Coverage',
            filters: ['Region', 'Assigned company', 'Customer status'],
            metrics: [
                { label: 'Covered pharmacies', value: '94', note: 'Assigned customers' },
                { label: 'Assigned products', value: '126', note: 'Visible catalog' },
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
        { id: 'rrt-1', metric: 'May Zin sales', value: '2.1M', comparison: '+16% vs May', status: 'Ready' },
        { id: 'rrt-2', metric: 'Commission preview', value: '210,000', comparison: 'Product rates only', status: 'Ready' },
        { id: 'rrt-3', metric: 'Rejected orders', value: '1', comparison: 'Needs follow-up', status: 'Warning' },
    ],
    summaries: [
        { label: 'Active reps', value: '9', note: 'One company per rep' },
        { label: 'Top rep', value: 'May Zin', note: '2.1M sales' },
        { label: 'Commission preview', value: '458K', note: 'This month' },
    ],
};

export const pharmacyReports = {
    eyebrow: 'Reports',
    title: 'Pharmacy Reports',
    description: 'Review pharmacy purchases, outstanding balances, credit status, payment history, and company-specific blocks.',
    primaryAction: 'Export report',
    filters: [
        { label: 'Pharmacy', options: ['All', 'Aung Pharmacy', 'Shwe Clinic Store', 'Mandalay Care'] },
        { label: 'Credit Status', options: ['All', 'Current', 'Warning', 'Blocked'] },
        { label: 'Period', options: ['Today', 'This Month', 'This Year', 'Custom Range'] },
    ],
    columns: [
        { key: 'pharmacy', label: 'Pharmacy' },
        { key: 'owner', label: 'Owner' },
        { key: 'orders', label: 'Orders' },
        { key: 'sales', label: 'Sales', type: 'money' },
        { key: 'outstanding', label: 'Outstanding', type: 'money' },
        { key: 'status', label: 'Credit', type: 'status' },
    ],
    rows: [
        { id: 'pr-1', pharmacy: 'Aung Pharmacy', owner: 'U Aung', orders: '12', sales: '1.4M', outstanding: '320,000', status: 'Blocked' },
        { id: 'pr-2', pharmacy: 'Shwe Clinic Store', owner: 'Daw Shwe', orders: '9', sales: '860,000', outstanding: '0', status: 'Current' },
        { id: 'pr-3', pharmacy: 'Mandalay Care', owner: 'Ko Htet', orders: '7', sales: '620,000', outstanding: '85,000', status: 'Warning' },
    ],
    formFields: [
        { label: 'Pharmacy', type: 'select', options: ['All', 'Aung Pharmacy', 'Shwe Clinic Store', 'Mandalay Care'] },
        { label: 'Credit status', type: 'select', options: ['All', 'Current', 'Warning', 'Blocked'] },
        ...baseReportFields,
    ],
    reportMetrics: [
        { label: 'Pharmacy sales', value: '2.88M', note: 'Selected period' },
        { label: 'Outstanding', value: '405,000', note: 'Customer balances' },
        { label: 'Blocked accounts', value: '1', note: 'Company-specific block' },
    ],
    reportChart: {
        eyebrow: 'Customer chart',
        title: 'Sales and outstanding by pharmacy',
        type: 'stacked',
        series: [
            { label: 'Aung Pharmacy', value: '1.4M sales', percent: 100, note: '320K outstanding / blocked' },
            { label: 'Shwe Clinic Store', value: '860K sales', percent: 61, note: '0 outstanding / current' },
            { label: 'Mandalay Care', value: '620K sales', percent: 44, note: '85K outstanding / warning' },
        ],
    },
    reportSummary: [
        { label: 'Top pharmacy', value: 'Aung Pharmacy', note: '1.4M sales this period' },
        { label: 'Clean account', value: 'Shwe Clinic', note: 'No outstanding balance' },
        { label: 'Outstanding total', value: '405,000', note: 'Across selected pharmacies' },
        { label: 'Credit action', value: '1 blocked', note: 'Company-specific block active' },
    ],
    reportCategories: [
        {
            key: 'purchase',
            label: 'Purchase',
            filters: ['Pharmacy', 'Company', 'Date range'],
            metrics: [
                { label: 'Orders', value: '28', note: 'Submitted and delivered' },
                { label: 'Top pharmacy', value: 'Aung Pharmacy', note: '1.4M sales' },
            ],
        },
        {
            key: 'credit',
            label: 'Credit',
            filters: ['Credit status', 'Aging bucket', 'Company block'],
            metrics: [
                { label: 'Blocked', value: '1', note: 'MediLife Co. only' },
                { label: 'Warning', value: '1', note: 'Payment due soon' },
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
        { id: 'prt-1', metric: 'Aung Pharmacy balance', value: '320,000', comparison: 'Over 30 days', status: 'Blocked' },
        { id: 'prt-2', metric: 'Shwe Clinic Store balance', value: '0', comparison: 'Clean account', status: 'Ready' },
        { id: 'prt-3', metric: 'Mandalay Care balance', value: '85,000', comparison: 'Warning bucket', status: 'Warning' },
    ],
    summaries: [
        { label: 'Active pharmacies', value: '48', note: 'Assigned customers' },
        { label: 'Outstanding', value: '405K', note: 'Selected accounts' },
        { label: 'Blocked', value: '1', note: 'Company-specific' },
    ],
};

export const financeReports = {
    eyebrow: 'Reports',
    title: 'Finance Reports',
    description: 'Review receivables, payables, payment collections, aging buckets, overdue states, and company payable alerts.',
    primaryAction: 'Export report',
    filters: [
        { label: 'Report Type', options: ['All', 'Receivables', 'Payables', 'Collections'] },
        { label: 'Status', options: ['All', 'Current', 'Warning', 'Critical', 'Paid'] },
        { label: 'Period', options: ['Today', 'This Month', 'This Year', 'Custom Range'] },
    ],
    columns: [
        { key: 'report', label: 'Report' },
        { key: 'current', label: 'Current', type: 'money' },
        { key: 'warning', label: 'Warning', type: 'money' },
        { key: 'critical', label: 'Critical', type: 'money' },
        { key: 'total', label: 'Total', type: 'money' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'fr-1', report: 'Accounts Receivable', current: '1.4M', warning: '620,000', critical: '2.1M', total: '5.2M', status: 'Critical' },
        { id: 'fr-2', report: 'Accounts Payable', current: '1.2M', warning: '1.9M', critical: '700,000', total: '3.8M', status: 'Warning' },
        { id: 'fr-3', report: 'Collections', current: '1.2M', warning: '0', critical: '0', total: '1.2M', status: 'Ready' },
    ],
    formFields: [
        { label: 'Finance report type', type: 'select', options: ['Receivables', 'Payables', 'Collections'] },
        { label: 'Aging status', type: 'select', options: ['All', 'Current', 'Warning', 'Critical', 'Paid'] },
        ...baseReportFields,
    ],
    reportMetrics: [
        { label: 'Receivables', value: '5.2M', note: 'Customer invoices' },
        { label: 'Payables', value: '3.8M', note: 'Company settlements' },
        { label: 'Collected today', value: '1.2M', note: '12 receipts' },
    ],
    reportChart: {
        eyebrow: 'Finance chart',
        title: 'Aging exposure by report type',
        type: 'bar',
        series: [
            { label: 'Receivables', value: '5.2M', percent: 100, note: '2.1M critical customer aging' },
            { label: 'Payables', value: '3.8M', percent: 73, note: 'Alert-only company aging' },
            { label: 'Collections', value: '1.2M', percent: 23, note: 'Today receipts' },
        ],
    },
    reportSummary: [
        { label: 'Critical receivable', value: '2.1M', note: 'Can affect customer/company credit approval' },
        { label: 'Payable due', value: '3.8M', note: 'Alert-only, never blocks operations' },
        { label: 'Collection count', value: '12', note: 'Receipts recorded today' },
        { label: 'Net watchlist', value: '700K', note: 'Critical company payable reminders' },
    ],
    reportCategories: [
        {
            key: 'receivables',
            label: 'Receivables',
            filters: ['Customer', 'Company', 'Aging bucket'],
            metrics: [
                { label: 'Overdue', value: '2.1M', note: 'Critical bucket' },
                { label: 'Blocked customers', value: '7', note: 'Company-specific' },
            ],
        },
        {
            key: 'payables',
            label: 'Payables',
            filters: ['Company', 'Due date', 'Payment status'],
            metrics: [
                { label: 'Due this week', value: '5', note: 'Alert-only' },
                { label: 'Critical payable', value: '1', note: 'Reminder only' },
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
        { id: 'frt-1', metric: 'Receivable overdue', value: '2.1M', comparison: '+4 invoices', status: 'Critical' },
        { id: 'frt-2', metric: 'Payables due', value: '3.8M', comparison: 'Alert-only', status: 'Warning' },
        { id: 'frt-3', metric: 'Collections', value: '1.2M', comparison: '12 receipts', status: 'Ready' },
    ],
    summaries: [
        { label: 'Receivables', value: '5.2M', note: '42 invoices' },
        { label: 'Payables', value: '3.8M', note: '8 settlements' },
        { label: 'Collected', value: '1.2M', note: 'Today' },
    ],
};
