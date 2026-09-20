import api from '../axios';

export const biometricAPI = {
  getAll: (params) => api.get('/api/v1/biometric-devices/', { params }),
  getById: (id) => api.get(`/api/v1/biometric-devices/${id}`),
  create: (data) => api.post('/api/v1/biometric-devices/', data),
  update: (id, data) => api.put(`/api/v1/biometric-devices/${id}`, data),
  delete: (id) => api.delete(`/api/v1/biometric-devices/${id}`),
  sync: (id) => api.post(`/api/v1/biometric-devices/${id}/sync`),
  // There is no hardware probe endpoint; this verifies the device record is reachable.
  test: (id) => api.get(`/api/v1/biometric-devices/${id}`),
  getSyncLogs: (id) => api.get(`/api/v1/biometric-devices/${id}/sync-logs`),
};
