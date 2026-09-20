import api from './axios';

export const login = (email, password) =>
  api.post('/auth/login', new URLSearchParams({ username: email, password }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', null, { params: { email, otp } });

export const logout = () => api.post('/auth/logout');

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', null, { params: { email } });

export const verifyResetOtp = (email, otp) =>
  api.post('/auth/verify-reset-otp', null, { params: { email, otp } });

export const resetPassword = (reset_token, new_password) =>
  api.post('/auth/reset-password', null, { params: { reset_token, new_password } });

export const register = (username, email, password, full_name) =>
  api.post('/auth/register', { username, email, password, full_name });

export const getMe = () => api.get('/auth/me');
