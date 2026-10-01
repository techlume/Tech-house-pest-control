import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { http, setAccessToken } from '../services/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tech_house_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        setSession(data.user);
        localStorage.setItem('tech_house_user', JSON.stringify(data.user));
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setAccessToken(null);
          setSession(null);
          localStorage.removeItem('tech_house_user');
          localStorage.removeItem('tech_house_access_token');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user: session,
      loading,
      login: async (credentials) => {
        const { data } = await http.post('/auth/login', credentials);
        setAccessToken(data.accessToken);
        setSession(data.user);
        localStorage.setItem('tech_house_user', JSON.stringify(data.user));
      },
      logout: async () => {
        await http.post('/auth/logout').catch(() => {});
        setAccessToken(null);
        setSession(null);
        localStorage.removeItem('tech_house_user');
        localStorage.removeItem('tech_house_access_token');
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
