import api from './axios';

export const getOutlets = () => api.get('/outlets/');
export const createOutlet = (data) => api.post('/outlets/', data);
export const updateOutlet = (id, data) => api.put(`/outlets/${id}`, data);
export const deleteOutlet = (id) => api.delete(`/outlets/${id}`);

export const getOutletProducts = (outletId) => api.get(`/outlets/${outletId}/products`);
export const addOutletProduct = (outletId, data) => api.post(`/outlets/${outletId}/products`, data);
export const updateOutletProduct = (outletId, productId, data) => api.put(`/outlets/${outletId}/products/${productId}`, data);
export const deleteOutletProduct = (outletId, productId) => api.delete(`/outlets/${outletId}/products/${productId}`);

export const createSale = (data) => api.post('/outlets/sales', data);
export const getOutletSales = (outletId) => api.get(`/outlets/${outletId}/sales`);
export const getAllSales = () => api.get('/outlets/sales/all');
export const getOutletSummary = (outletId) => api.get(`/outlets/${outletId}/summary`);
