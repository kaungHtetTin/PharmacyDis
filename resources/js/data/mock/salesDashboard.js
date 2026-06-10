export const salesMetrics = [
    { icon: 'cart', label: 'Today orders', value: '7', note: '3 waiting approval' },
    { icon: 'wallet', label: 'Monthly sales', value: '2.1M', note: 'Assigned companies' },
    { icon: 'users', label: 'Customers', value: '48', note: '6 with overdue balance' },
    { icon: 'box', label: 'Assigned items', value: '126', note: 'Visible catalog products' },
];

export const quickActions = [
    { label: 'New order', href: 'new-order', icon: 'cart' },
    { label: 'Customer list', href: 'pharmacies', icon: 'users' },
    { label: 'Stock check', href: 'stock', icon: 'packageCheck' },
];

export const assignedProducts = [
    { code: 'PRD-018', name: 'Paracetamol 500mg', company: 'MediLife Co.', stock: '120 Boxes', status: 'Available' },
    { code: 'PRD-044', name: 'Amoxicillin 250mg', company: 'Zenith Pharma', stock: '42 Boxes', status: 'Warning' },
    { code: 'PRD-087', name: 'Cough Syrup 100ml', company: 'Golden Health', stock: '18 Cartons', status: 'Available' },
];

export const customerNotes = [
    { name: 'Aung Pharmacy', balance: '320,000', company: 'MediLife Co.', status: 'Blocked' },
    { name: 'Shwe Clinic Store', balance: '0', company: 'Zenith Pharma', status: 'Active' },
    { name: 'Mandalay Care', balance: '85,000', company: 'Golden Health', status: 'Warning' },
];

export const assignedCompanies = [
    { id: 'sco-1', company: 'MediLife Co.', products: '54 products', orders: '24', status: 'Active' },
    { id: 'sco-2', company: 'Zenith Pharma', products: '42 products', orders: '14', status: 'Active' },
    { id: 'sco-3', company: 'Golden Health', products: '30 products', orders: '8', status: 'Active' },
];

export const salesStatusCounts = [
    { label: 'Submitted', value: '7', note: 'Waiting approval' },
    { label: 'Approved', value: '12', note: 'Warehouse queue' },
    { label: 'Rejected', value: '1', note: 'Needs follow-up' },
    { label: 'Delivered', value: '18', note: 'This month' },
];
