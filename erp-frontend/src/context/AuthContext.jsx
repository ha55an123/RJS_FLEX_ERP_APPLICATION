import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAuthStorage,
  isTokenExpired,
  userFromToken,
} from '../utils/authStorage';
import { registerSessionInvalidHandler } from '../utils/authEvents';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const applyAccessToken = useCallback((accessToken) => {
    setTokens(accessToken, getRefreshToken());
    setUser(userFromToken(accessToken));
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('Missing refresh token');
    }

    const { data } = await api.post('/auth/refresh', null, {
      params: { token: refreshToken },
    });
    applyAccessToken(data.access_token);
    return data.access_token;
  }, [applyAccessToken]);

  const restoreSession = useCallback(async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken && !refreshToken) {
      setUser(null);
      return false;
    }

    if (accessToken && !isTokenExpired(accessToken)) {
      setUser(userFromToken(accessToken));
      try {
        await api.get('/auth/me');
        return true;
      } catch (err) {
        if (!err.response) {
          return true;
        }
        if (err.response.status !== 401 || !refreshToken) {
          if (err.response.status === 401) {
            clearAuthStorage();
            setUser(null);
          }
          return false;
        }
      }
    }

    if (!refreshToken) {
      clearAuthStorage();
      setUser(null);
      return false;
    }

    try {
      await refreshAccessToken();
      await api.get('/auth/me');
      return true;
    } catch {
      clearAuthStorage();
      setUser(null);
      return false;
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    let active = true;

    registerSessionInvalidHandler(() => {
      clearAuthStorage();
      setUser(null);
    });

    restoreSession().finally(() => {
      if (active) setInitializing(false);
    });

    return () => {
      active = false;
      registerSessionInvalidHandler(null);
    };
  }, [restoreSession]);

  const signin = (accessToken, refreshToken) => {
    setTokens(accessToken, refreshToken);
    setUser(userFromToken(accessToken));
  };

  const signout = () => {
    clearAuthStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, signin, signout, refreshAccessToken, applyAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
