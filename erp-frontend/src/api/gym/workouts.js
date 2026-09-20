import api from '../axios';

export const workoutsAPI = {
  // Plans
  getPlans: (params) => api.get('/api/v1/workouts/plans', { params }),
  getPlanById: (id) => api.get(`/api/v1/workouts/plans/${id}`),
  createPlan: (data) => api.post('/api/v1/workouts/plans', data),
  updatePlan: (id, data) => api.put(`/api/v1/workouts/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/api/v1/workouts/plans/${id}`),

  // Exercises
  getExercises: (params) => api.get('/api/v1/workouts/exercises', { params }),
  createExercise: (data) => api.post('/api/v1/workouts/exercises', data),
  updateExercise: (id, data) => api.put(`/api/v1/workouts/exercises/${id}`, data),
  deleteExercise: (id) => api.delete(`/api/v1/workouts/exercises/${id}`),

  // Assignments
  assignToMember: (planId, memberId, data) => api.post('/api/v1/workouts/assign', { plan_id: planId, member_id: memberId, ...data }),
  getMemberWorkouts: (memberId) => api.get(`/api/v1/workouts/member/${memberId}/plan`),

  // Progress
  logProgress: (data) => api.post('/api/v1/workouts/progress', data),
  getProgress: (memberId, params) => api.get(`/api/v1/workouts/progress/${memberId}`, { params }),
};
