// src/api/staff.js
// ============================================================
// Llamadas a la API para el personal (odontólogos).
// ============================================================
import api from './client';

// Lista los odontólogos activos (para el selector de citas)
export const getDentists = async () => {
  const response = await api.get('/staff/dentists');
  return response.data.data;
};
