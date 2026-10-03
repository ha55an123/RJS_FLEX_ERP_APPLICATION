import api from '../axios';

const fingerprintAttendanceAPI = {
  recordAttendance: (data) => api.post('/api/v1/fingerprint-attendance/record', data),
  
  getDeviceStatus: (deviceId) => api.get(`/api/v1/fingerprint-attendance/device-status/${deviceId}`),
  
  listDevices: (branchId) => api.get('/api/v1/fingerprint-attendance/devices', { params: { branch_id: branchId } }),
  
  enrollFingerprint: (data) => api.post('/api/v1/fingerprint-attendance/enroll', data),
  
  getMemberFingerprintStatus: (memberId) => api.get(`/api/v1/fingerprint-attendance/member/${memberId}`),
};

export default fingerprintAttendanceAPI;
