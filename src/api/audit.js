// src/api/audit.js
// ============================================================
// Llamadas a la API del registro de auditoría (solo admin).
// ============================================================
import api from './client';

// Una página del registro, del más reciente al más antiguo (50 por página).
// Filtros opcionales: usuario (id), accion (código del catálogo), tabla,
// registroId, from / to en hora local 'YYYY-MM-DDTHH:mm:ss' (to excluido).
// Devuelve { data, pagination }: aquí no se desenvuelve solo data porque
// la paginación viaja al mismo nivel.
export const getAuditLogs = async (filters = {}, { signal } = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  );
  const response = await api.get('/audit', { params, signal });
  return response.data;
};
