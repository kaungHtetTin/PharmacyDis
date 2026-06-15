const invoiceItems = [
    { id: 'ii-1', product: 'Paracetamol 500mg', unit: '10 Boxes', quantity: '1,000 Tablets', foc: '1 Box', total: '320,000', status: 'Ready' },
    { id: 'ii-2', product: 'Amoxicillin 250mg', unit: '4 Cards', quantity: '40 Capsules', foc: 'None', total: '100,000', status: 'Ready' },
];

const documents = [
    {
        title: 'A4 Invoice',
        type: 'A4',
        items: [
            { label: 'Invoice', value: 'INV-1004' },
            { label: 'Order', value: 'SO-1008' },
            { label: 'Customer', value: 'Aung Pharmacy' },
            { label: 'Amount due', value: '420,000 MMK' },
        ],
    },
    {
        title: 'Delivery Voucher',
        type: 'A4',
        items: [
            { label: 'Voucher', value: 'DV-1004' },
            { label: 'Warehouse', value: 'Main Warehouse' },
            { label: 'Packages', value: '10 Boxes, 4 Cards, 1 FOC Box' },
            { label: 'Prepared by', value: 'Warehouse Staff' },
        ],
    },
    {
        title: 'Payment Receipt',
        type: 'receipt',
        items: [
            { label: 'Receipt', value: 'RCPT-2003' },
            { label: 'Customer', value: 'Aung Pharmacy' },
            { label: 'Paid amount', value: '120,000 MMK' },
            { label: 'Balance', value: '300,000 MMK' },
        ],
    },
];

export const invoices = {
    eyebrow: 'Documents',
    title: 'Invoices',
    description: 'Generate invoices from approved order records, then print sales invoices, delivery vouchers, and payment receipts.',
    primaryAction: 'Generate invoice from order',
    primaryActionTarget: 'orders',
    viewActionLabel: 'View invoice',
    showEditAction: false,
    rowActions: [
        { label: 'Print invoice', openDrawer: true },
        { label: 'Delete invoice', confirm: true, variant: 'danger' },
    ],
    filters: [
        { label: 'Status', options: ['All', 'Paid', 'Unpaid', 'Printed', 'Prepared'] },
        { label: 'Customer', options: ['All', 'Aung Pharmacy', 'Mandalay Care', 'Shwe Clinic Store'] },
        { label: 'Template', options: ['All', 'A4 Invoice', 'Delivery Voucher', 'Payment Receipt'] },
    ],
    columns: [
        { key: 'invoice', label: 'Invoice' },
        { key: 'order', label: 'Order' },
        { key: 'pharmacy', label: 'Pharmacy' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'amount', label: 'Amount', type: 'money' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'inv-1004', invoice: 'INV-1004', order: 'SO-1008', pharmacy: 'Aung Pharmacy', dueDate: '17 Jun 2026', amount: '420,000', status: 'Unpaid', invoiceItems, documents },
        { id: 'inv-1003', invoice: 'INV-1003', order: 'SO-1007', pharmacy: 'Shwe Clinic Store', dueDate: '16 Jun 2026', amount: '185,000', status: 'Printed', invoiceItems: [invoiceItems[1]], documents },
        { id: 'inv-1002', invoice: 'INV-1002', order: 'SO-1006', pharmacy: 'Mandalay Care', dueDate: '14 Jun 2026', amount: '265,000', status: 'Paid', invoiceItems: [], documents },
    ],
    formFields: [
        { label: 'Invoice date', type: 'date' },
        { label: 'Due date', type: 'date' },
        { label: 'Payment status', type: 'select', options: ['Paid', 'Unpaid', 'Partial Payment'] },
        { label: 'Print template', type: 'select', options: ['A4 Invoice', 'Delivery Voucher', 'Payment Receipt'] },
        { label: 'Document note', type: 'textarea' },
    ],
    factFields: [
        { key: 'invoice', label: 'Invoice no.' },
        { key: 'order', label: 'Order' },
        { key: 'pharmacy', label: 'Pharmacy' },
        { key: 'dueDate', label: 'Due date' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
    ],
    invoiceItems,
    documents,
    print: { title: 'Sales Invoice', type: 'A4' },
    drawerSections: [
        { title: 'Contextual generation rule', items: ['Invoice generation starts from the related approved order record', 'Order, pharmacy, products, FOC, discount, and totals are copied into the invoice', 'Invoice form does not require searching a large order selector'] },
        { title: 'Document workflow', items: ['Invoice is generated from approved sales order', 'Delivery voucher uses selected units and warehouse checklist', 'Receipt can be printed after payment allocation'] },
    ],
    summaries: [
        { label: 'Unpaid invoices', value: '42', note: '5.2M outstanding' },
        { label: 'Printed today', value: '18', note: 'Invoices and vouchers' },
        { label: 'Paid invoices', value: '94', note: 'This month' },
    ],
};
