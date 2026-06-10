const focExamples = [
    { title: 'Quantity rule', type: 'Active', condition: 'Buy 10 Boxes of Paracetamol 500mg', reward: 'Get 1 Box free from the same company promotion.' },
    { title: 'Value rule', type: 'Draft', condition: 'Spend 1,000,000 MMK on Zenith Pharma products', reward: 'Get 1 Amoxicillin carton as FOC item.' },
];

export const focRules = {
    eyebrow: 'Promotions',
    title: 'FOC Rules',
    description: 'Configure quantity-based, value-based, and date-limited free-of-charge product promotions.',
    primaryAction: 'Add FOC rule',
    filters: [
        { label: 'Rule Type', options: ['All', 'Quantity', 'Value'] },
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Status', options: ['All', 'Active', 'Draft', 'Expired'] },
    ],
    columns: [
        { key: 'rule', label: 'Rule' },
        { key: 'type', label: 'Type' },
        { key: 'company', label: 'Company' },
        { key: 'product', label: 'Product' },
        { key: 'validity', label: 'Validity' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'foc-001', rule: 'Buy 10 get 1', type: 'Quantity', company: 'MediLife Co.', product: 'Paracetamol 500mg', validity: '01 Jun - 30 Jun 2026', status: 'Active' },
        { id: 'foc-002', rule: 'Spend 1M get 1 Carton', type: 'Value', company: 'Zenith Pharma', product: 'Amoxicillin 250mg', validity: '01 Jun - 15 Jul 2026', status: 'Active' },
        { id: 'foc-003', rule: 'Seasonal syrup support', type: 'Quantity', company: 'Golden Health', product: 'Cough Syrup 100ml', validity: '01 Jul - 31 Jul 2026', status: 'Draft' },
    ],
    formFields: [
        { label: 'Rule type', type: 'select', options: ['Quantity Based', 'Value Based'] },
        { label: 'Company', type: 'select', options: ['MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Eligible product', type: 'select', options: ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Cough Syrup 100ml'] },
        { label: 'Buy quantity or spend value', type: 'number' },
        { label: 'Reward product', type: 'select', options: ['Same product', 'Amoxicillin 250mg', 'Cough Syrup 100ml'] },
        { label: 'Get quantity', type: 'number' },
        { label: 'Start date', type: 'date' },
        { label: 'End date', type: 'date' },
    ],
    focExamples,
    tabs: [
        { key: 'quantity', label: 'Quantity Rule', lines: ['Buy X quantity in selected unit', 'Convert purchased quantity to base unit for validation', 'Add configured FOC product to order preview'] },
        { key: 'value', label: 'Value Rule', lines: ['Spend target amount', 'Get product free', 'Promotion dates control active availability'] },
    ],
    summaries: [
        { label: 'Active rules', value: '4', note: '2 quantity, 2 value' },
        { label: 'Draft rules', value: '1', note: 'Needs review' },
        { label: 'Expiring soon', value: '2', note: 'Next 15 days' },
    ],
};
