import api from '../axios';

const REPORT_MAP = {
  attendance: 'attendance',
  revenue:    'revenue',
  membership: 'members',
  workout:    'members',
  payment:    'revenue',
  inventory:  'equipment-status',
};

export const reportsAPI = {
  getMemberReport:     (params) => api.get('/api/v1/reports/members',              { params }),
  getAttendanceReport: (params) => api.get('/api/v1/reports/attendance',           { params }),
  getRevenueReport:    (params) => api.get('/api/v1/reports/revenue',              { params }),
  getExpiringReport:   (params) => api.get('/api/v1/reports/expiring-memberships', { params }),
  getEquipmentReport:  (params) => api.get('/api/v1/reports/equipment-status',     { params }),
  exportMembers:       (params) => api.get('/api/v1/reports/export/members',       { params, responseType: 'blob' }),
  exportAttendance:    (params) => api.get('/api/v1/reports/export/attendance',    { params, responseType: 'blob' }),

  // Used by ReportsPage
  generate: (type, params) => {
    const route = REPORT_MAP[type] || 'revenue';
    return api.get(`/api/v1/reports/${route}`, { params });
  },
  export: (type, format, params) => {
    const route = type === 'attendance' ? 'attendance' : 'members';
    return api.get(`/api/v1/reports/export/${route}`, { params, responseType: 'blob' });
  },
};
