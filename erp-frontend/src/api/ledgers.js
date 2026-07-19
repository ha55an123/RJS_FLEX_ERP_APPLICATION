import api from './axios';

export const getLedgers = (params) => api.get('/ledgers/', { params });
export const getLedger = (id) => api.get(`/ledgers/${id}`);
export const createLedger = (data) => api.post('/ledgers/', data);
export const updateLedger = (id, data) => api.put(`/ledgers/${id}`, data);
export const deleteLedger = (id) => api.delete(`/ledgers/${id}`);
export const exportLedgersCSV = () => api.get('/ledgers/export/csv', { responseType: 'blob' });
