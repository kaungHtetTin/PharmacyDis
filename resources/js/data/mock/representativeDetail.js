export const representativeDetail = {
    profile: {
        code: 'SR-001',
        name: 'May Zin',
        phone: '09 450 000 001',
        region: 'Yangon North',
        status: 'Active',
        companies: 'MediLife Co.',
        productAccess: '54 assigned products',
    },
    metrics: [
        { label: 'Monthly sales', value: '2.1M', note: '+16% from last month' },
        { label: 'Orders', value: '38', note: '7 submitted today' },
        { label: 'Delivered', value: '26', note: 'This month' },
        { label: 'Commission preview', value: '210,000', note: 'Product-rate estimate' },
    ],
    performanceChart: [
        { label: 'Week 1', value: '420K', percent: 48 },
        { label: 'Week 2', value: '560K', percent: 64 },
        { label: 'Week 3', value: '790K', percent: 90 },
        { label: 'Week 4', value: '330K', percent: 38 },
    ],
    salesHistoryColumns: [
        { key: 'order', label: 'Order' },
        { key: 'pharmacy', label: 'Pharmacy' },
        { key: 'company', label: 'Company' },
        { key: 'date', label: 'Date' },
        { key: 'amount', label: 'Amount', type: 'money' },
        { key: 'status', label: 'Status', type: 'status' },
    ],
    salesHistoryRows: [
        { id: 'sh-001', order: 'SO-1008', pharmacy: 'Aung Pharmacy', company: 'MediLife Co.', date: '10 Jun 2026', amount: '420,000', status: 'Submitted' },
        { id: 'sh-002', order: 'SO-1007', pharmacy: 'Shwe Clinic Store', company: 'MediLife Co.', date: '09 Jun 2026', amount: '185,000', status: 'Approved' },
        { id: 'sh-003', order: 'SO-1006', pharmacy: 'Mandalay Care', company: 'MediLife Co.', date: '07 Jun 2026', amount: '265,000', status: 'Delivered' },
        { id: 'sh-004', order: 'SO-1005', pharmacy: 'Aung Pharmacy', company: 'MediLife Co.', date: '06 Jun 2026', amount: '320,000', status: 'Rejected' },
    ],
    topProducts: [
        { label: 'Paracetamol 500mg', value: '18 orders', note: '1.12M sales' },
        { label: 'Amoxicillin 250mg', value: '12 orders', note: '620K sales' },
        { label: 'Cough Syrup 100ml', value: '8 orders', note: '360K sales' },
    ],
    pharmacyRanking: [
        { label: 'Aung Pharmacy', value: '420,000', note: 'Highest current month customer' },
        { label: 'Shwe Clinic Store', value: '185,000', note: 'Approved order pipeline' },
        { label: 'Mandalay Care', value: '265,000', note: 'Delivered this month' },
    ],
};
