import api from './axios';

export const getExpenses = (params) => api.get('/expenses/', { params });
export const getExpenseSummary = () => api.get('/expenses/summary');
export const getExpense = (id) => api.get(`/expenses/${id}`);
export const createExpense = (data) => api.post('/expenses/', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
export const uploadReceipt = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/expenses/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const exportExpensesCSV = () => api.get('/expenses/export/csv', { responseType: 'blob' });
