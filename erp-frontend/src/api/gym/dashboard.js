import api from '../axios';

export const gymDashboardAPI = {
  getOverview: (branchId) => api.get(`/api/v1/dashboard/overview${branchId ? `?branch_id=${branchId}` : ''}`),
  getAttendanceChart: (branchId) => api.get(`/api/v1/dashboard/attendance-chart${branchId ? `?branch_id=${branchId}` : ''}`),
  getRevenueChart: (branchId) => api.get(`/api/v1/dashboard/revenue-chart${branchId ? `?branch_id=${branchId}` : ''}`),
  getBranchComparison: () => api.get('/api/v1/dashboard/branch-comparison'),
};
