import api from './axios';

export const upsertAttendance = (payload) => api.post('/attendance-payroll/attendance', payload);

export const runPayroll = (payload) => api.post('/attendance-payroll/payroll/runs', payload);

export const getPayrollRun = (runId) => api.get(`/attendance-payroll/payroll/runs/${runId}`);


