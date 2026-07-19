import api from './axios';

export const getPurchases = () => api.get('/purchases/');
export const createPurchase = (data) => api.post('/purchases/', data);
export const receivePurchase = (id) => api.post(`/purchases/${id}/receive`);
export const cancelPurchase = (id) => api.post(`/purchases/${id}/cancel`);
