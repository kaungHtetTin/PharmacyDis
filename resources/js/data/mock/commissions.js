export const commissions = {
    eyebrow: 'Finance',
    title: 'Product Commission Rules',
    description: 'Configure commission rates by product and review product-based monthly commission summaries.',
    primaryAction: 'Add product commission',
    filters: [
        { label: 'Company', options: ['All', 'MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Product', options: ['All', 'Paracetamol 500mg', 'Amoxicillin 250mg', 'Cough Syrup 100ml'] },
        { label: 'Rate', options: ['All', '5%', '10%', '15%'] },
        { label: 'Status', options: ['All', 'Active', 'Inactive'] },
    ],
    columns: [
        { key: 'product', label: 'Product' },
        { key: 'company', label: 'Company' },
        { key: 'rate', label: 'Rate' },
        { key: 'effectiveDate', label: 'Effective Date' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    rows: [
        { id: 'com-001', company: 'MediLife Co.', product: 'Paracetamol 500mg', rate: '8%', effectiveDate: '2026-06-01', status: 'Active' },
        { id: 'com-002', company: 'Zenith Pharma', product: 'Amoxicillin 250mg', rate: '5%', effectiveDate: '2026-06-01', status: 'Active' },
        { id: 'com-003', company: 'Golden Health', product: 'Cough Syrup 100ml', rate: '12%', effectiveDate: '2026-06-01', status: 'Active' },
    ],
    formFields: [
        { label: 'Product', type: 'select', options: ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Cough Syrup 100ml'] },
        { label: 'Company', type: 'select', options: ['MediLife Co.', 'Zenith Pharma', 'Golden Health'] },
        { label: 'Commission rate', type: 'number' },
        { label: 'Effective date', type: 'date' },
        { label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
    commissionPreviewRows: [
        { id: 'cp-1', company: 'MediLife Co.', product: 'Paracetamol 500mg', rate: '8%', sale: '420,000', commission: '33,600' },
        { id: 'cp-2', company: 'Zenith Pharma', product: 'Amoxicillin 250mg', rate: '5%', sale: '185,000', commission: '9,250' },
        { id: 'cp-3', company: 'Golden Health', product: 'Cough Syrup 100ml', rate: '12%', sale: '265,000', commission: '31,800' },
    ],
    drawerSections: [
        { title: 'Calculation rule', items: ['Commission uses the sold product rate', 'Company is shown for grouping only', 'No company-level commission rate is used'] },
        { title: 'Example', items: ['Paracetamol sale: 420,000 x 8% = 33,600', 'Cough Syrup sale: 265,000 x 12% = 31,800'] },
    ],
    summaries: [
        { label: 'Product rates', value: '126', note: 'Active product commission rows' },
        { label: 'Average rate', value: '8.4%', note: 'Across active products' },
        { label: 'Missing rates', value: '0', note: 'Every active product configured' },
    ],
};
