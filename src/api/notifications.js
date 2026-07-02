// src/api/notifications.js
// ============================================================
// Llamadas a la API para el panel de notificaciones (citas próximas).
// ============================================================
import api from './client';

// Obtiene las citas próximas (el backend filtra por rol y rango).
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data.data;
};
