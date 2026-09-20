import { jwtDecode } from './jwt';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isTokenExpired(token, bufferSeconds = 30) {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 <= Date.now() + bufferSeconds * 1000;
  } catch {
    return true;
  }
}

export function userFromToken(token) {
  const decoded = jwtDecode(token);
  return {
    sub: decoded.sub,
    email: decoded.sub,
    role: decoded.role?.toLowerCase(),
    name: decoded.name || decoded.sub,
  };
}
