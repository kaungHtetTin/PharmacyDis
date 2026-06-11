import {
    salesNewOrder,
    salesOrders,
    salesPharmacies,
    salesStock,
} from './mock/salesModules';

export const salesModules = {
    stock: salesStock,
    pharmacies: salesPharmacies,
    'new-order': salesNewOrder,
    orders: salesOrders,
};
