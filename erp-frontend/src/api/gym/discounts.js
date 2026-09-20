import api from '../axios';

export const discountsAPI = {
  getAll: (params) => api.get('/api/v1/discounts/', { params }),
  getActive: (params) => api.get('/api/v1/discounts/active/', { params }),
  getById: (id) => api.get(`/api/v1/discounts/${id}/`),
  create: (data) => api.post('/api/v1/discounts/', data),
  update: (id, data) => api.put(`/api/v1/discounts/${id}/`, data),
  delete: (id) => api.delete(`/api/v1/discounts/${id}/`),
  incrementUsage: (id) => api.post(`/api/v1/discounts/${id}/increment-usage/`),
};
