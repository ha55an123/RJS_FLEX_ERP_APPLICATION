import api from '../axios';

export const dietAPI = {
  // Meal Plans
  getPlans: (params) => api.get('/api/v1/diet/plans', { params }),
  getPlanById: (id) => api.get(`/api/v1/diet/plans/${id}`),
  createPlan: (data) => api.post('/api/v1/diet/plans', data),
  deletePlan: (id) => api.delete(`/api/v1/diet/plans/${id}`),

  // Assignments
  assignToMember: (data) => api.post('/api/v1/diet/assign', data),
  getMemberDiet: (memberId) => api.get(`/api/v1/diet/member/${memberId}/plan`),

  // Nutrition Log
  logNutrition: (data) => api.post('/api/v1/diet/nutrition-log', data),
  getNutritionLog: (memberId, params) => api.get(`/api/v1/diet/nutrition-log/${memberId}`, { params }),
};
