// src/api/auth.js
// ============================================================
// Llamadas a la API relacionadas con autenticación.
// ============================================================
import api from './client';

/**
 * Hace login contra el backend.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} { user, accessToken, refreshToken }
 */
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data.data; // el backend envuelve en { message, data }
};

/**
 * Obtiene los datos del usuario autenticado actual.
 */
export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

/**
 * Cambia la contraseña del usuario autenticado.
 * El servidor cierra sus otras sesiones y devuelve tokens nuevos.
 * @returns {Promise<object>} { accessToken, refreshToken }
 */
export const changeOwnPassword = async (current_password, new_password) => {
  const response = await api.patch('/auth/me/password', { current_password, new_password });
  return response.data.data;
};
