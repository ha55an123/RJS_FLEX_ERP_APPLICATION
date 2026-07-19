import api from './axios';

export const getUtilityBills = (params) => api.get('/utility-bills/', { params });
export const getUtilityBillSummary = () => api.get('/utility-bills/summary');
export const getUpcomingBills = () => api.get('/utility-bills/upcoming');
export const getUtilityBill = (id) => api.get(`/utility-bills/${id}`);
export const createUtilityBill = (data) => api.post('/utility-bills/', data);
export const updateUtilityBill = (id, data) => api.put(`/utility-bills/${id}`, data);
export const markBillPaid = (id) => api.post(`/utility-bills/${id}/pay`);
export const deleteUtilityBill = (id) => api.delete(`/utility-bills/${id}`);
export const uploadBillReceipt = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/utility-bills/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const exportBillsCSV = () => api.get('/utility-bills/export/csv', { responseType: 'blob' });
