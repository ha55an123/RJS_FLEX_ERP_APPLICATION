import api from '../axios';

export const biometricRegistrationsAPI = {
  // List devices with capabilities
  listDevices: (branchId) => api.get('/api/v1/biometric/devices', { params: { branch_id: branchId } }),
  
  // Get device capabilities
  getDeviceCapabilities: (deviceId) => api.get(`/api/v1/biometric/device/${deviceId}/capabilities`),
  
  // Get member biometric status
  getMemberStatus: (memberId) => api.get(`/api/v1/biometric/member/${memberId}`),
  
  // Enroll biometric (fingerprint or face)
  enroll: (data) => api.post('/api/v1/biometric/enroll', data),
  
  // Delete biometric registration
  deleteRegistration: (registrationId) => api.delete(`/api/v1/biometric/registration/${registrationId}`),
};
