import api from './axios';

export const getAllOrders = () => api.get('/orders/');
export const getMyOrders = () => api.get('/orders/my');
export const placeOrder = (items) => api.post('/orders/', { items });
