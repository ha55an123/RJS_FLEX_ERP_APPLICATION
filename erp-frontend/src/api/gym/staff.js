import api from '../axios';

export const staffAPI = {
  getAll: (params) => api.get('/api/v1/staff/', { params }),
  getById: (id) => api.get(`/api/v1/staff/${id}/`),
  create: (data) => api.post('/api/v1/staff/', data),
  update: (id, data) => api.put(`/api/v1/staff/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/staff/${id}/`),
  getTrainers: (branchId) => api.get(`/api/v1/staff/trainers/${branchId ? `?branch_id=${branchId}` : ''}`),
  getSchedule: (id) => api.get(`/api/v1/staff/${id}/schedule/`),
  updateSchedule: (id, data) => api.put(`/api/v1/staff/${id}/schedule/`, data),
};
