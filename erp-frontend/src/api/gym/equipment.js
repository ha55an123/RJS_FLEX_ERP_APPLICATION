import api from '../axios';

export const equipmentAPI = {
  getAll: (params) => api.get('/api/v1/equipment', { params }),
  getById: (id) => api.get(`/api/v1/equipment/${id}`),
  create: (data) => api.post('/api/v1/equipment', data),
  update: (id, data) => api.put(`/api/v1/equipment/${id}`, data),
  delete: (id) => api.delete(`/api/v1/equipment/${id}`),
  getMaintenanceLogs: (id) => api.get(`/api/v1/equipment/${id}/maintenance`),
  addMaintenanceLog: (id, data) => api.post(`/api/v1/equipment/${id}/maintenance`, data),
  getDueMaintenance: (branchId) => api.get(`/api/v1/equipment/maintenance/due${branchId ? `?branch_id=${branchId}` : ''}`),
};
