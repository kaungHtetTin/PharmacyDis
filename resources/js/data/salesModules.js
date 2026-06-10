import {
    salesNewOrder,
    salesOrders,
    salesPerformance,
    salesPharmacies,
    salesProducts,
    salesStock,
} from './mock/salesModules';

export const salesModules = {
    products: salesProducts,
    stock: salesStock,
    pharmacies: salesPharmacies,
    'new-order': salesNewOrder,
    orders: salesOrders,
    performance: salesPerformance,
};
