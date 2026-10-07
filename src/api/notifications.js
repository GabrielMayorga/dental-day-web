// src/api/notifications.js
// ============================================================
// Llamadas a la API para el panel de notificaciones (citas próximas).
// ============================================================
import api from './client';

// Obtiene las citas próximas (el backend filtra por rol y rango).
// signal (opcional) permite cancelar la petición (AbortController).
export const getNotifications = async ({ signal } = {}) => {
  const response = await api.get('/notifications', { signal });
  return response.data.data;
};
