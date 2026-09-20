import api from '../axios';

export const membershipsAPI = {
  getAll: (params) => api.get('/api/v1/memberships/subscriptions/', { params }),
  getById: (id) => api.get(`/api/v1/memberships/subscriptions/${id}/`),
  create: (data) => api.post('/api/v1/memberships/subscriptions/', data),
  update: (id, data) => api.put(`/api/v1/memberships/subscriptions/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/memberships/subscriptions/${id}/`),
  renew: (id, data) => api.post(`/api/v1/memberships/subscriptions/${id}/renew/`, data),
  freeze: (id, data) => api.post(`/api/v1/memberships/subscriptions/${id}/freeze/`, data),
  unfreeze: (id) => api.post(`/api/v1/memberships/subscriptions/${id}/unfreeze/`),
  transfer: (id, data) => api.post(`/api/v1/memberships/subscriptions/${id}/transfer/`, data),
};

export const membershipPlansAPI = {
  getAll: (params) => api.get('/api/v1/memberships/plans/', { params }),
  getById: (id) => api.get(`/api/v1/memberships/plans/${id}/`),
  create: (data) => api.post('/api/v1/memberships/plans/', data),
  update: (id, data) => api.put(`/api/v1/memberships/plans/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/memberships/plans/${id}/`),
};
