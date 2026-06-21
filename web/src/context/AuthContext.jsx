import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = anonymous

  async function refresh() {
    try {
      const me = await api.get('/api/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function login(nik, password) {
    await api.post('/api/auth/login', { nik, password });
    await refresh();
  }

  async function register(nama, nik, password) {
    await api.post('/api/auth/register', { nama, nik, password });
    await login(nik, password);
  }

  async function logout() {
    await api.post('/api/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
