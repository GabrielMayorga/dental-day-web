// src/context/AuthContext.jsx
// ============================================================
// Contexto de autenticación: estado global de la sesión.
// Permite que cualquier componente sepa si hay un usuario
// logueado, y haga login/logout, sin pasar props manualmente.
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app, si hay token guardado, recuperamos el usuario
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Función de login: guarda el token y el usuario
  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('token', data.accessToken);
    setUser(data.user);
    return data.user;
  };

  // Función de logout: limpia todo
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto fácilmente: const { user, login } = useAuth();
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
