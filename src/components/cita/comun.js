// src/components/cita/comun.js
// ============================================================
// Utilidades compartidas por los componentes del diálogo de
// nueva cita (textos y formatos). Sin componentes: así el
// fast refresh de los .jsx sigue funcionando.
// ============================================================
import { parseFechaLocal, formatFecha } from '../../utils/fechas';

/** 'María', 'Mendez' → 'MM' */
export const iniciales = (nombre = '', apellido = '') =>
  `${nombre.trim()[0] ?? ''}${apellido.trim()[0] ?? ''}`.toUpperCase() || '?';

export const nombreCompleto = (p) =>
  p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : '';

const mayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** '2026-10-08' → 'Jueves 8 de octubre' */
export const fechaLarga = (fecha) => {
  const d = parseFechaLocal(fecha);
  if (!d) return '';
  return `${mayuscula(formatFecha(d, { weekday: 'long' }))} ${d.getDate()} de ${formatFecha(d, { month: 'long' })}`;
};

/** '2026-10-08' → 'jueves 8' */
export const diaCorto = (fecha) => {
  const d = parseFechaLocal(fecha);
  return d ? `${formatFecha(d, { weekday: 'long' })} ${d.getDate()}` : '';
};

/** '2026-10-09' → 'Vie 9' */
export const chipDia = (fecha) => {
  const d = parseFechaLocal(fecha);
  const dia = formatFecha(d, { weekday: 'short' }).replace('.', '');
  return `${mayuscula(dia)} ${d.getDate()}`;
};

// Misma regla que el backend (patients.validation.js): al menos 8
// dígitos; admite espacios, guiones, paréntesis y prefijo +.
export const TELEFONO = /^(?=(?:[^\d]*\d){8,})[\d+\-\s()]{8,25}$/;

/** Mensaje de error del backend o uno genérico. */
export const mensajeError = (err, porDefecto) =>
  err?.response?.data?.error || err?.response?.data?.message || porDefecto;
