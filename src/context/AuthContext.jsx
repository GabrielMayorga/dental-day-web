// src/context/AuthContext.jsx
// ============================================================
// Contexto de autenticación: estado global de la sesión.
// Permite que cualquier componente sepa si hay un usuario
// logueado, y haga login/logout, sin pasar props manualmente.
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';
import {
  getAccessToken, setTokens, clearTokens, tokenRequiresPasswordChange,
} from '../api/tokens';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app, si hay token guardado, recuperamos el usuario
  useEffect(() => {
    if (getAccessToken()) {
      authApi.getMe()
        .then(setUser)
        .catch(() => clearTokens())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Función de login: guarda los tokens y el usuario
  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    setTokens(data);
    setUser(data.user);
    return data.user;
  };

  // Función de logout: limpia todo
  const logout = () => {
    clearTokens();
    setUser(null);
  };

  // Tras cambiar la contraseña: el servidor revocó los tokens anteriores
  // y entregó otros. Se guardan y la marca de cambio obligatorio se
  // actualiza con lo que diga el token nuevo.
  const replaceTokens = (tokens) => {
    setTokens(tokens);
    setUser((prev) => prev && {
      ...prev,
      must_change_password: tokenRequiresPasswordChange(tokens.accessToken),
    });
  };

  // Mientras el token traiga mcp = true, solo se permite crear la contraseña
  const mustChangePassword = Boolean(user) &&
    (user.must_change_password === true || tokenRequiresPasswordChange(getAccessToken()));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, replaceTokens, mustChangePassword }}>
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
