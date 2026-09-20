import api from '../axios';

const faceBiometricsAPI = {
  register: (memberId, formData) => {
    const data = new FormData();
    data.append('image', formData.image);
    if (formData.branch_id) data.append('branch_id', formData.branch_id);
    return api.post(`/api/v1/face-biometrics/register/${memberId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  recognize: (formData) => {
    const data = new FormData();
    data.append('image', formData.image);
    if (formData.branch_id) data.append('branch_id', formData.branch_id);
    return api.post('/api/v1/face-biometrics/recognize', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getStatus: (memberId) => api.get(`/api/v1/face-biometrics/status/${memberId}`),
  
  delete: (memberId) => api.delete(`/api/v1/face-biometrics/delete/${memberId}`),
};

export default faceBiometricsAPI;
