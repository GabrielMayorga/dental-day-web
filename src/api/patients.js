// src/api/patients.js
// ============================================================
// Llamadas a la API para el módulo de pacientes.
// Cada función corresponde a un endpoint del backend.
// ============================================================
import api from './client';

// Listar pacientes (con búsqueda opcional)
export const getPatients = async (search = '') => {
  const response = await api.get('/patients', { params: { search } });
  return response.data.data;
};

// Obtener un paciente por id
export const getPatient = async (id) => {
  const response = await api.get(`/patients/${id}`);
  return response.data.data;
};

// Crear un paciente
export const createPatient = async (data) => {
  const response = await api.post('/patients', data);
  return response.data.data;
};

// Actualizar un paciente
export const updatePatient = async (id, data) => {
  const response = await api.patch(`/patients/${id}`, data);
  return response.data.data;
};

// Desactivar un paciente (borrado lógico)
export const deletePatient = async (id) => {
  const response = await api.delete(`/patients/${id}`);
  return response.data;
};
