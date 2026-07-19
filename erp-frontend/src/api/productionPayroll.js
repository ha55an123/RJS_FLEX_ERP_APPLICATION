import api from './axios';

// Production Departments
export const getProductionDepartments = (params) => api.get('/production/departments', { params });
export const createProductionDepartment = (data) => api.post('/production/departments', data);
export const updateProductionDepartment = (id, data) => api.put(`/production/departments/${id}`, data);
export const deleteProductionDepartment = (id) => api.delete(`/production/departments/${id}`);

// Production Technologies
export const getProductionTechnologies = (params) => api.get('/production/technologies', { params });
export const createProductionTechnology = (data) => api.post('/production/technologies', data);
export const updateProductionTechnology = (id, data) => api.put(`/production/technologies/${id}`, data);
export const deleteProductionTechnology = (id) => api.delete(`/production/technologies/${id}`);

// Employee Technology Assignments
export const getEmployeeAssignments = (params) => api.get('/production/assignments', { params });
export const createEmployeeAssignment = (data) => api.post('/production/assignments', data);
export const updateEmployeeAssignment = (id, data) => api.put(`/production/assignments/${id}`, data);
export const deleteEmployeeAssignment = (id) => api.delete(`/production/assignments/${id}`);

// Production Entries
export const getProductionEntries = (params) => api.get('/production/entries', { params });
export const createProductionEntry = (data) => api.post('/production/entries', data);
export const updateProductionEntry = (id, data) => api.put(`/production/entries/${id}`, data);
export const deleteProductionEntry = (id) => api.delete(`/production/entries/${id}`);

// Production Loans
export const getProductionLoans = (params) => api.get('/production/loans', { params });
export const createProductionLoan = (data) => api.post('/production/loans', data);
export const updateProductionLoan = (id, data) => api.put(`/production/loans/${id}`, data);
export const deleteProductionLoan = (id) => api.delete(`/production/loans/${id}`);

// Production Advances
export const getProductionAdvances = (params) => api.get('/production/advances', { params });
export const createProductionAdvance = (data) => api.post('/production/advances', data);
export const updateProductionAdvance = (id, data) => api.put(`/production/advances/${id}`, data);
export const deleteProductionAdvance = (id) => api.delete(`/production/advances/${id}`);

// Production Payroll
export const runProductionPayroll = (data) => api.post('/production/payroll/runs', data);
export const listProductionPayrollRuns = () => api.get('/production/payroll/runs');
export const getProductionPayrollRun = (runId) => api.get(`/production/payroll/runs/${runId}`);
