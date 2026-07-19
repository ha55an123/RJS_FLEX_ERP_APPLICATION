import api from './axios';

export const getMyInvoices = () => api.get('/invoices/');
export const getAllInvoices = () => api.get('/invoices/all');
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const updateInvoiceStatus = (id, status) =>
  api.patch(`/invoices/${id}/status`, { status });
export const downloadInvoice = (id) =>
  api.get(`/invoices/${id}/download`, { responseType: 'blob' });
