import api from '../axios';

export const attendanceAPI = {
  checkIn: (data) => api.post('/api/v1/attendance/checkin/', data),
  manualCheckIn: (data) => api.post('/api/v1/attendance/manual/', data),
  getToday: (branchId) => api.get(`/api/v1/attendance/today/${branchId ? `?branch_id=${branchId}` : ''}`),
  getMemberHistory: (memberId, params) => api.get(`/api/v1/attendance/member/${memberId}/`, { params }),
  getDailyReport: (date, branchId) => api.get(`/api/v1/attendance/today/${branchId ? `?branch_id=${branchId}` : ''}`),
  // The check-in endpoint deliberately toggles an open attendance record to checkout.
  checkOut: (memberCode, branchId) => api.post('/api/v1/attendance/checkin/', {
    identifier: memberCode,
    method: 'manual',
    branch_id: branchId,
  }),
  recordStaffAttendance: (data) => api.post('/api/v1/attendance/staff/', data),
  getStaffAttendance: (staffId, params) => api.get(`/api/v1/attendance/staff/${staffId}/`, { params }),
};
