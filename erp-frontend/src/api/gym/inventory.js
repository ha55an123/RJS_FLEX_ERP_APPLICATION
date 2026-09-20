import api from '../axios';

export const inventoryAPI = {
  getAll: (params) => api.get('/api/v1/inventory/', { params }),
  getById: (id) => api.get(`/api/v1/inventory/${id}/`),
  create: (data) => api.post('/api/v1/inventory/', data),
  update: (id, data) => api.put(`/api/v1/inventory/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/inventory/${id}/`),
  getLowStock: (branchId) =>
    api.get('/api/v1/inventory/', {
      params: { low_stock: true, ...(branchId ? { branch_id: branchId } : {}) },
    }),
  adjustStock: (id, data) => api.post(`/api/v1/inventory/${id}/adjust/`, data),
};
