// src/api/clinicalRecords.js
// ============================================================
// Llamadas a la API para la historia clínica (registros).
// ============================================================
import api from './client';

// Lista los registros clínicos de un paciente
export const getPatientRecords = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/records`);
  return response.data.data;
};

// Crea un registro clínico para un paciente
export const createPatientRecord = async (patientId, data) => {
  const response = await api.post(`/patients/${patientId}/records`, data);
  return response.data.data;
};

// Obtiene un registro por id
export const getRecord = async (id) => {
  const response = await api.get(`/records/${id}`);
  return response.data.data;
};

// Actualiza un registro
export const updateRecord = async (id, data) => {
  const response = await api.patch(`/records/${id}`, data);
  return response.data.data;
};
