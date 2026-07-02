// src/api/reports.js
// ============================================================
// Llamadas a la API para el panel de indicadores (reportes).
// ============================================================
import api from './client';

// Obtiene los datos del dashboard. El backend decide el alcance
// (global para admin, personal para odontólogo) según el token.
export const getDashboard = async () => {
  const response = await api.get('/reports/dashboard');
  return response.data.data;
};
