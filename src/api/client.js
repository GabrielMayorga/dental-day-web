// src/api/client.js
// ============================================================
// Cliente HTTP centralizado (axios) para hablar con la API.
// Aquí configuramos la URL base y los "interceptores" que
// agregan el token a cada petición y renuevan la sesión.
// ============================================================
import axios from 'axios';
import {
  getAccessToken, getRefreshToken, setTokens, clearTokens,
  setLogoutReason, LOGOUT_REASONS,
} from './tokens';

// La URL del backend. En desarrollo es localhost:4000.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const api = axios.create({ baseURL });

// Cliente aparte, SIN interceptores, solo para renovar tokens:
// si el refresh pasara por el interceptor de respuesta, un 401
// del propio refresh intentaría renovarse a sí mismo.
const refreshClient = axios.create({ baseURL });

export const PASSWORD_CHANGE_PATH = '/crear-contrasena';

// ── Interceptor de PETICIÓN ──
// Antes de enviar cualquier petición, si tenemos un token guardado,
// lo agregamos a la cabecera Authorization automáticamente.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Renovación de tokens ──
// Si varias peticiones reciben 401 a la vez, comparten UNA sola
// llamada a /auth/refresh en vez de lanzar una cada una.
let refreshInFlight = null;

const refreshTokens = () => {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post('/auth/refresh', { refreshToken: getRefreshToken() })
      .then((response) => {
        const tokens = response.data.data;
        setTokens(tokens);
        return tokens.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// Cierra la sesión desde fuera de React: limpia los tokens y recarga
// en el login (AuthContext arranca de cero sin usuario).
const endSession = (reason) => {
  clearTokens();
  if (reason) setLogoutReason(reason);
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const isSessionRevoked = (err) =>
  err?.response?.status === 401 && err.response.data?.code === 'SESSION_REVOKED';

// Login y refresh responden 401 por credenciales o token malo:
// no tiene sentido intentar renovar la sesión con ellos.
const isAuthEndpoint = (url = '') => /\/auth\/(login|refresh)$/.test(url);

// ── Interceptor de RESPUESTA ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    // El servidor exige crear la contraseña antes de operar
    if (response?.status === 403 && response.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (window.location.pathname !== PASSWORD_CHANGE_PATH) {
        window.location.replace(PASSWORD_CHANGE_PATH);
      }
      return Promise.reject(error);
    }

    if (response?.status !== 401 || isAuthEndpoint(config?.url)) {
      return Promise.reject(error);
    }

    // La contraseña cambió (aquí o por un admin): la sesión no se renueva
    if (isSessionRevoked(error)) {
      endSession(LOGOUT_REASONS.SESSION_REVOKED);
      return Promise.reject(error);
    }

    // Access token vencido: renovar una vez y repetir la petición
    if (!config._retried && getRefreshToken()) {
      config._retried = true;
      try {
        const accessToken = await refreshTokens();
        config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);
      } catch (refreshError) {
        endSession(isSessionRevoked(refreshError) ? LOGOUT_REASONS.SESSION_REVOKED : null);
        return Promise.reject(error);
      }
    }

    endSession();
    return Promise.reject(error);
  }
);

export default api;
