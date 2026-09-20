import api from '../axios';

export const branchesAPI = {
  getAll: (params) => api.get('/api/v1/branches/', { params }),
  getById: (id) => api.get(`/api/v1/branches/${id}/`),
  create: (data) => api.post('/api/v1/branches/', data),
  update: (id, data) => api.put(`/api/v1/branches/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/branches/${id}/`),
};
