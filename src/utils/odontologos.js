// src/utils/odontologos.js
// ============================================================
// Identidad visual de cada odontólogo en la agenda: nombre,
// iniciales y un color propio para su avatar y su filtro.
//
// El color del BLOQUE de la cita sigue siendo el del estado
// (viene de appointment_statuses en la BD). El color del
// odontólogo solo identifica a quién pertenece la cita.
// ============================================================

// Tonos que no se confunden con los colores de estado
// (azul, verde, ámbar, gris y rojo).
const PALETA = ['#0F766E', '#7C3AED', '#DB2777', '#0369A1', '#B45309', '#4F46E5'];

export const nombreOdontologo = (d) =>
  (d ? `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() : '') || d?.name || '—';

export const inicialesOdontologo = (d) =>
  `${d?.first_name?.trim()[0] ?? ''}${d?.last_name?.trim()[0] ?? ''}`.toUpperCase() || '?';

/**
 * Color estable por odontólogo: depende de su posición en la lista
 * que devuelve el backend (ordenada por apellido), no del azar.
 */
export const colorOdontologo = (dentists, staffId) => {
  const i = dentists.findIndex((d) => String(d.id) === String(staffId));
  return PALETA[(i < 0 ? 0 : i) % PALETA.length];
};

/**
 * Mezcla un color con transparencia usando color-mix de CSS,
 * así el mismo hex sirve de relleno suave en claro y en oscuro.
 */
export const tinte = (hex, porcentaje) =>
  `color-mix(in srgb, ${hex} ${porcentaje}%, transparent)`;

/** Versión más oscura (modo claro) o más clara (modo oscuro) para texto. */
export const tinta = (hex, oscuro) =>
  oscuro
    ? `color-mix(in srgb, ${hex} 55%, white)`
    : `color-mix(in srgb, ${hex} 72%, black)`;
