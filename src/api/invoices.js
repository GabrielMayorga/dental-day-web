// src/api/invoices.js
// ============================================================
// Llamadas a la API para el módulo de facturación.
// ============================================================
import api from './client';

// Lista facturas. Filtros opcionales: { status, patient_id }
export const getInvoices = async (filters = {}) => {
  const response = await api.get('/invoices', { params: filters });
  return response.data.data;
};

// Una factura con sus renglones
export const getInvoice = async (id) => {
  const response = await api.get(`/invoices/${id}`);
  return response.data.data;
};

// Crea una factura.
// data = { patient_id, appointment_id?, discount?, notes?, items: [{ treatment_id, quantity }] }
export const createInvoice = async (data) => {
  const response = await api.post('/invoices', data);
  return response.data.data;
};

// Cambia el estado: 'pending' | 'paid' | 'cancelled' | 'partial'
export const changeInvoiceStatus = async (id, status) => {
  const response = await api.patch(`/invoices/${id}/status`, { status });
  return response.data.data;
};
