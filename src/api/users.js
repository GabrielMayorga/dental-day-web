// src/api/users.js
// ============================================================
// Llamadas a la API para la gestión de usuarios (solo admin).
// ============================================================
import api from './client';

// Lista todos los usuarios
export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data.data;
};

// Crea un usuario (si role='dentist', incluir first_name, last_name, speciality, phone)
export const createUser = async (data) => {
  const response = await api.post('/users', data);
  return response.data.data;
};

// Cambia el rol de un usuario
export const changeUserRole = async (id, role) => {
  const response = await api.patch(`/users/${id}/role`, { role });
  return response.data.data;
};

// Activa o desactiva un usuario
export const changeUserStatus = async (id, is_active) => {
  const response = await api.patch(`/users/${id}/status`, { is_active });
  return response.data.data;
};
