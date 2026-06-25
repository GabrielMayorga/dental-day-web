// src/api/client.js
// ============================================================
// Cliente HTTP centralizado (axios) para hablar con la API.
// Aquí configuramos la URL base y los "interceptores" que
// agregan el token a cada petición automáticamente.
// ============================================================
import axios from 'axios';

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

// ── Interceptor de RESPUESTA ──
// Si el backend responde 401 (token inválido/expirado),
// limpiamos el token y mandamos al usuario al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
