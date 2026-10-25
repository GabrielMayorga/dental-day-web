// src/api/client.js
// ============================================================
// Cliente HTTP centralizado (axios) para hablar con la API.
// Aquí configuramos la URL base y los "interceptores" que
// agregan el token a cada petición automáticamente.
// ============================================================
import axios from 'axios';
import { isRateLimited, retryAfterSeconds } from './rateLimit';

// La URL del backend. En desarrollo es localhost:4000.
// Más adelante, en producción, será la URL de Railway.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
});

// ── Interceptor de PETICIÓN ──
// Antes de enviar cualquier petición, si tenemos un token guardado,
// lo agregamos a la cabecera Authorization automáticamente.
// Así no tenemos que ponerlo manualmente en cada llamada.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Aviso de límite de peticiones (429) ──
// El interceptor no conoce React: avisa a quien se suscriba
// (RateLimitNotice muestra el mensaje). Varias peticiones limitadas
// a la vez (p. ej. los bloques del inicio) generan UN solo aviso:
// no se repite hasta que pase el tiempo de Retry-After.
const rateLimitListeners = new Set();
let rateLimitNoticeUntil = 0;

export const onRateLimited = (listener) => {
  rateLimitListeners.add(listener);
  return () => rateLimitListeners.delete(listener);
};

const notifyRateLimited = (error) => {
  if (Date.now() < rateLimitNoticeUntil) return;
  rateLimitNoticeUntil = Date.now() + retryAfterSeconds(error) * 1000;
  rateLimitListeners.forEach((listener) => listener());
};

// ── Interceptor de RESPUESTA ──
// Si el backend responde 401 (token inválido/expirado),
// limpiamos el token y mandamos al usuario al login.
// Un 429 solo se avisa; no se reintenta en automático. El login
// tiene su propio mensaje con cuenta regresiva.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isRateLimited(error) && error.config?.url !== '/auth/login') {
      notifyRateLimited(error);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Redirige al login si no estamos ya ahí
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
