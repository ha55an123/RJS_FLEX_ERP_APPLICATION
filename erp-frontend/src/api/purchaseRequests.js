import api from './axios';

export const getPurchaseRequests = (params) => api.get('/purchase-requests/', { params });
export const getPurchaseRequestSummary = () => api.get('/purchase-requests/summary');
export const getPurchaseRequest = (id) => api.get(`/purchase-requests/${id}`);
export const createPurchaseRequest = (data) => api.post('/purchase-requests/', data);
export const updatePurchaseRequest = (id, data) => api.put(`/purchase-requests/${id}`, data);
export const managerApprove = (id, comments) => api.post(`/purchase-requests/${id}/manager-approve`, { comments });
export const adminApprove = (id, comments) => api.post(`/purchase-requests/${id}/admin-approve`, { comments });
export const rejectRequest = (id, comments) => api.post(`/purchase-requests/${id}/reject`, { comments });
export const cancelRequest = (id) => api.post(`/purchase-requests/${id}/cancel`);
export const deletePurchaseRequest = (id) => api.delete(`/purchase-requests/${id}`);
export const exportRequestsCSV = () => api.get('/purchase-requests/export/csv', { responseType: 'blob' });
