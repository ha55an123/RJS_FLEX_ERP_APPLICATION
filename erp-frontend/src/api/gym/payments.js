import api from '../axios';

export const paymentsAPI = {
  getAll: (params) => api.get('/api/v1/payments/', { params }),
  getById: (id) => api.get(`/api/v1/payments/${id}/`),
  create: (data) => api.post('/api/v1/payments/', data),
  update: (id, data) => api.put(`/api/v1/payments/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/payments/${id}/`),
  getMemberPayments: (memberId) => api.get(`/api/v1/payments/member/${memberId}/pending/`),
  getOutstanding: (branchId) => api.get(`/api/v1/payments/${branchId ? `?branch_id=${branchId}` : ''}`),
};
