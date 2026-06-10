const allocations = [
    { id: 'pa-1', reference: 'INV-1004', amount: '420,000', allocated: '120,000', balance: '300,000', status: 'Due' },
    { id: 'pa-2', reference: 'INV-1003', amount: '185,000', allocated: '185,000', balance: '0', status: 'Paid' },
];

export const payments = {
    eyebrow: 'Finance',
    title: 'Payments',
    description: 'Record customer payments, allocate payments to invoices, and issue payment receipts.',
    primaryAction: 'Record payment',
    filters: [
        { label: 'Method', options: ['All', 'Cash', 'Bank', 'Mobile Pay'] },
        { label: 'Customer', options: ['All', 'Aung Pharmacy', 'Mandalay Care', 'Shwe Clinic Store'] },
        { label: 'Status', options: ['All', 'Completed', 'Pending', 'Partial Payment'] },
    ],
    columns: [
        { key: 'payment', label: 'Payment' },
        { key: 'customer', label: 'Customer' },
        { key: 'invoice', label: 'Invoice' },
        { key: 'amount', label: 'Amount', type: 'money' },
        { key: 'method', label: 'Method' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'pay-2003', payment: 'PAY-2003', customer: 'Aung Pharmacy', invoice: 'INV-1004', amount: '120,000', method: 'Cash', status: 'Partial Payment', allocations },
        { id: 'pay-2002', payment: 'PAY-2002', customer: 'Shwe Clinic Store', invoice: 'INV-1003', amount: '185,000', method: 'Cash', status: 'Completed', allocations: [allocations[1]] },
        { id: 'pay-2001', payment: 'PAY-2001', customer: 'Mandalay Care', invoice: 'INV-1002', amount: '265,000', method: 'Bank', status: 'Completed', allocations: [] },
    ],
    formFields: [
        { label: 'Customer', type: 'select', options: ['Aung Pharmacy', 'Shwe Clinic Store', 'Mandalay Care'] },
        { label: 'Invoice', type: 'select', options: ['INV-1004', 'INV-1003', 'INV-1002'] },
        { label: 'Received amount', type: 'number' },
        { label: 'Payment method', type: 'select', options: ['Cash', 'Bank', 'Mobile Pay'] },
        { label: 'Payment date', type: 'date' },
        { label: 'Allocation note', type: 'textarea' },
    ],
    factFields: [
        { key: 'payment', label: 'Payment no.' },
        { key: 'customer', label: 'Customer' },
        { key: 'invoice', label: 'Invoice' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
        { key: 'status', label: 'Status' },
    ],
    allocations,
    print: { title: 'Payment Receipt', type: 'receipt' },
    drawerSections: [
        { title: 'Payment allocation workflow', items: ['Allocate payment to one or more invoices', 'Show remaining customer balance before saving', 'Print receipt after allocation'] },
    ],
    summaries: [
        { label: 'Collected today', value: '1.2M', note: '12 receipts' },
        { label: 'Partial payments', value: '3', note: 'Need balance follow-up' },
        { label: 'Bank payments', value: '370,000', note: '3 transfers' },
    ],
};
