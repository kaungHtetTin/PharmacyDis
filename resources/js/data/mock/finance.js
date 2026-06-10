const receivableAgingBuckets = [
    { label: 'Current', value: '1.4M', status: 'Current' },
    { label: '1-7 days', value: '620,000', status: 'Warning' },
    { label: '8-30 days', value: '2.1M', status: 'Critical' },
    { label: '60+ days', value: '1.1M', status: 'Blocked' },
];

const payableAgingBuckets = [
    { label: 'Current', value: '1.2M', status: 'Current' },
    { label: 'Due this week', value: '1.9M', status: 'Warning' },
    { label: 'Overdue', value: '700,000', status: 'Critical' },
    { label: 'Settled', value: '4.8M', status: 'Paid' },
];

export const receivables = {
    eyebrow: 'Finance',
    title: 'Accounts Receivable',
    description: 'Track outstanding customer invoices, aging buckets, overdue status, and company-specific customer credit blocking.',
    primaryAction: 'View aging',
    filters: [
        { label: 'Aging', options: ['All', 'Current', '1-7 Days', '8-30 Days', '60+ Days'] },
        { label: 'Status', options: ['All', 'Warning', 'Critical', 'Blocked'] },
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
    ],
    columns: [
        { key: 'customer', label: 'Customer' },
        { key: 'company', label: 'Company' },
        { key: 'current', label: 'Current', type: 'money' },
        { key: 'days7', label: '1-7 Days', type: 'money' },
        { key: 'days30', label: '8-30 Days', type: 'money' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'ar-001', customer: 'Aung Pharmacy', company: 'MediLife Co.', current: '0', days7: '0', days30: '320,000', status: 'Blocked', agingBuckets: receivableAgingBuckets },
        { id: 'ar-002', customer: 'Mandalay Care', company: 'Golden Health', current: '85,000', days7: '0', days30: '0', status: 'Warning', agingBuckets: receivableAgingBuckets },
        { id: 'ar-003', customer: 'Shwe Clinic Store', company: 'Zenith Pharma', current: '0', days7: '0', days30: '0', status: 'Current', agingBuckets: receivableAgingBuckets },
    ],
    formFields: [
        { label: 'Customer', type: 'select', options: ['Aung Pharmacy', 'Mandalay Care', 'Shwe Clinic Store'] },
        { label: 'Company', type: 'select', options: ['MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Credit term days', type: 'number' },
        { label: 'Due date', type: 'date' },
        { label: 'Credit status', type: 'select', options: ['Current', 'Warning', 'Critical', 'Blocked'] },
    ],
    agingBuckets: receivableAgingBuckets,
    warningCards: [
        { label: 'Customer warning', note: 'Over 7 days creates visible warning on order approval.', status: 'Warning' },
        { label: 'Customer block', note: 'Company-specific block can prevent customer order approval.', status: 'Blocked' },
    ],
    tabs: [
        { key: 'aging', label: 'Aging Buckets', lines: ['Current: 1.4M', '8-30 days: 2.1M', '60+ days: 1.1M'] },
        { key: 'blocking', label: 'Blocking', lines: ['Customer credit can block approval by company', 'Block status appears on sales order review'] },
    ],
    summaries: [
        { label: 'Outstanding', value: '5.2M', note: '42 invoices' },
        { label: 'Warning', value: '12', note: 'Over 7 days' },
        { label: 'Critical', value: '7', note: 'Over 30 days' },
    ],
};

export const payables = {
    eyebrow: 'Finance',
    title: 'Accounts Payable',
    description: 'Track money owed to pharmaceutical companies after stock receiving, paid amounts, due amounts, and settlement due dates.',
    primaryAction: 'Record company payment',
    filters: [
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Status', options: ['All', 'Warning', 'Critical', 'Paid'] },
        { label: 'Due Date', options: ['All', 'Due this week', 'Overdue'] },
    ],
    columns: [
        { key: 'company', label: 'Company' },
        { key: 'receipt', label: 'Receipt' },
        { key: 'companyInvoice', label: 'Company Invoice' },
        { key: 'amountDue', label: 'Amount Due', type: 'money' },
        { key: 'paidAmount', label: 'Paid', type: 'money' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'ap-001', company: 'MediLife Co.', receipt: 'GRN-1004', companyInvoice: 'ML-INV-7781', amountDue: '1.8M', paidAmount: '0', dueDate: '16 Jun 2026', status: 'Warning', agingBuckets: payableAgingBuckets },
        { id: 'ap-002', company: 'Zenith Pharma', receipt: 'GRN-1003', companyInvoice: 'ZP-INV-1044', amountDue: '600,000', paidAmount: '500,000', dueDate: '15 Jun 2026', status: 'Warning', agingBuckets: payableAgingBuckets },
        { id: 'ap-003', company: 'Golden Health', receipt: 'GRN-1002', companyInvoice: 'GH-INV-901', amountDue: '0', paidAmount: '900,000', dueDate: '14 Jun 2026', status: 'Paid', agingBuckets: payableAgingBuckets },
    ],
    formFields: [
        { label: 'Company', type: 'select', options: ['MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Stock receipt', type: 'select', options: ['GRN-1004', 'GRN-1003', 'GRN-1002'] },
        { label: 'Company invoice number' },
        { label: 'Payment amount', type: 'number' },
        { label: 'Payment date', type: 'date' },
        { label: 'Payment status', type: 'select', options: ['Due', 'Partial Payment', 'Paid'] },
    ],
    agingBuckets: payableAgingBuckets,
    warningCards: [
        { label: 'Company payable warning', note: 'Creates finance alert only; no operational blocking.', status: 'Warning' },
        { label: 'Company payable critical', note: 'Escalates to critical finance reminder only.', status: 'Critical' },
    ],
    drawerSections: [
        { title: 'Payable source', items: ['Created from stock receiving', 'Company invoice number is linked to GRN', 'Due amount equals receiving total minus paid amount'] },
        { title: 'Alert-only rule', items: ['Company payable aging never blocks stock receiving', 'Company payable aging never blocks order approval, order creation, invoicing, or delivery', 'Aging creates reminders, warnings, and critical finance alerts only'] },
    ],
    summaries: [
        { label: 'Outstanding', value: '3.8M', note: '8 settlements' },
        { label: 'Due this week', value: '5', note: 'Reminder alerts' },
        { label: 'Critical', value: '1', note: 'Over 30 days' },
    ],
};
