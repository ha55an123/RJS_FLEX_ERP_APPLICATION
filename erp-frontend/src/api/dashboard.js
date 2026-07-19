import api from './axios';

export const getOverview = () => api.get('/dashboard/overview');
export const getRevenue = () => api.get('/dashboard/revenue');
export const getOrdersSummary = () => api.get('/dashboard/orders-summary');
export const getDashboardInventory = () => api.get('/dashboard/inventory');
export const getProductionMetrics = () => api.get('/dashboard/production-metrics');
export const getAccountingMetrics = () => api.get('/dashboard/accounting-metrics');
