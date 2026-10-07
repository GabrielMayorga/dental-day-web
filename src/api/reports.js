// src/api/reports.js
// ============================================================
// Llamadas a la API para el panel de indicadores (reportes).
// ============================================================
import api from './client';

// Obtiene los datos del dashboard. El backend decide el alcance
// (global para admin, personal para odontólogo) según el token.
// from / to son opcionales, en hora local: 'YYYY-MM-DDTHH:mm:ss'.
// signal (opcional) permite cancelar la petición (AbortController).
export const getDashboard = async ({ from = null, to = null } = {}, { signal } = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const response = await api.get('/reports/dashboard', { params, signal });
  return response.data.data;
};
