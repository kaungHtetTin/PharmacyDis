import { companies } from './mock/companies';
import { inventory } from './mock/inventory';
import { invoices } from './mock/invoices';
import { payables, receivables } from './mock/finance';
import { payments } from './mock/payments';
import { pharmacies } from './mock/pharmacies';
import { products } from './mock/products';
import { receiving } from './mock/receiving';
import { financeReports, pharmacyReports, representativeReports } from './mock/reports';
import { representatives } from './mock/representatives';
import { settings } from './mock/settings';
import { units } from './mock/units';
import { orders } from './mock/orders';

export const officeModules = {
    companies,
    products,
    units,
    pharmacies,
    representatives,
    inventory,
    receiving,
    orders,
    invoices,
    payments,
    receivables,
    payables,
    'reports-representatives': representativeReports,
    'reports-pharmacies': pharmacyReports,
    'reports-finance': financeReports,
    settings,
};
