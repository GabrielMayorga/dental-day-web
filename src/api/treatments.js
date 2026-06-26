// src/api/treatments.js
// ============================================================
// Llamadas a la API para el catálogo de tratamientos.
// ============================================================
import api from './client';

// Lista los tratamientos activos (para el formulario de citas)
export const getTreatments = async () => {
  const response = await api.get('/treatments');
  return response.data.data;
};
