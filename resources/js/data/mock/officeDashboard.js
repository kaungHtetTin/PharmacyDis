export const officeMetrics = [
    { icon: 'chart', label: 'Total sales', value: '128.6M', note: 'Year-to-date confirmed sales' },
    { icon: 'wallet', label: 'Monthly sales', value: '18.4M', note: '+12% from last month' },
    { icon: 'receipt', label: 'Receivables', value: '5.2M', note: '42 invoices outstanding' },
    { icon: 'building', label: 'Payables', value: '3.8M', note: '8 company settlements due' },
    { icon: 'box', label: 'Low stock', value: '17', note: 'Needs purchasing review' },
    { icon: 'packageCheck', label: 'Near expiry', value: '23', note: 'Within 90 days' },
];

export const orderQueue = [
    { id: 'SO-1008', pharmacy: 'Aung Pharmacy', rep: 'May Zin', company: 'Company A', total: '420,000', status: 'Submitted' },
    { id: 'SO-1007', pharmacy: 'Shwe Clinic Store', rep: 'Ko Htet', company: 'Company C', total: '185,000', status: 'Approved' },
    { id: 'SO-1006', pharmacy: 'Mandalay Care', rep: 'Nilar', company: 'Company B', total: '265,000', status: 'Delivered' },
];

export const officeAlerts = [
    { title: '17 products low stock', detail: 'Reorder review needed for fast-moving items', status: 'Low Stock' },
    { title: '12 batches near expiry', detail: 'Review stock expiring within 90 days', status: 'Warning' },
    { title: 'Overdue customer payment', detail: 'Aung Pharmacy overdue for Company A invoice', status: 'Overdue' },
    { title: 'Overdue company payment', detail: 'Company C settlement is past due', status: 'Critical' },
];

export const topProducts = [
    { id: 'top-prd-1', product: 'Paracetamol 500mg', company: 'Company A', sales: '4.8M', orders: '64', status: 'Active' },
    { id: 'top-prd-2', product: 'Amoxicillin 250mg', company: 'Company B', sales: '3.1M', orders: '42', status: 'Active' },
    { id: 'top-prd-3', product: 'Vitamin C Syrup', company: 'Company A', sales: '2.4M', orders: '36', status: 'Active' },
];

export const topPharmacies = [
    { id: 'top-cus-1', pharmacy: 'Aung Pharmacy', sales: '1.4M', outstanding: '320,000', status: 'Blocked' },
    { id: 'top-cus-2', pharmacy: 'Shwe Clinic Store', sales: '1.1M', outstanding: '0', status: 'Active' },
    { id: 'top-cus-3', pharmacy: 'Mandalay Care', sales: '950,000', outstanding: '85,000', status: 'Warning' },
];

export const topRepresentatives = [
    { id: 'top-sr-1', rep: 'May Zin', company: 'Company A', sales: '2.1M', orders: '38', status: 'Active' },
    { id: 'top-sr-2', rep: 'Ko Htet', company: 'Company B', sales: '1.6M', orders: '31', status: 'Active' },
    { id: 'top-sr-3', rep: 'Nilar', company: 'Company C', sales: '1.1M', orders: '22', status: 'Active' },
];
