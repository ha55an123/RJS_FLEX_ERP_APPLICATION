import api from '../axios';

export const membersAPI = {
  getAll: (params) => api.get('/api/v1/members/', { params }),
  getById: (id) => api.get(`/api/v1/members/${id}/`),
  create: (data) => api.post('/api/v1/members/', data),
  update: (id, data) => api.put(`/api/v1/members/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/members/${id}/`),
  getStats: (branchId) => api.get(`/api/v1/members/stats/${branchId ? `?branch_id=${branchId}` : ''}`),
};
