import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from '../utils/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Force re-login if token missing name field
        if (!decoded.name) {
          localStorage.clear();
        } else {
          setUser(decoded);
        }
      } catch {
        localStorage.clear();
      }
    }
  }, []);

  const signin = (access_token, refresh_token) => {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setUser(jwtDecode(access_token));
  };

  const signout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signin, signout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
