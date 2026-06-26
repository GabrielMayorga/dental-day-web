// src/api/appointments.js
// ============================================================
// Llamadas a la API para el módulo de citas/agenda.
// ============================================================
import api from './client';

// Listar citas con filtros opcionales (from, to, staffId)
export const getAppointments = async (params = {}) => {
  const response = await api.get('/appointments', { params });
  return response.data.data;
};

// Crear una cita
export const createAppointment = async (data) => {
  const response = await api.post('/appointments', data);
  return response.data.data;
};

// Cambiar el estado de una cita
export const changeAppointmentStatus = async (id, status, cancelled_reason) => {
  const response = await api.patch(`/appointments/${id}/status`, { status, cancelled_reason });
  return response.data.data;
};
