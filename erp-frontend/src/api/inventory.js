import api from './axios';

export const getInventory = () => api.get('/inventory/');
export const createInventoryItem = (data) => api.post('/inventory/', data);
export const addStock = (sku, qty, location) =>
  api.post('/inventory/add', null, { params: { sku, qty, location } });
export const removeStock = (sku, qty, location) =>
  api.post('/inventory/remove', null, { params: { sku, qty, location } });
