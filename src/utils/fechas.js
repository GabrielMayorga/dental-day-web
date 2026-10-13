// src/utils/fechas.js
// ============================================================
// Módulo ÚNICO de fechas del frontend.
//
// Las fechas de la clínica (scheduled_at, birth_date) son HORA DE
// PARED: "2026-10-07T08:00:00" significa las 8:00 en la clínica,
// no un instante UTC. El backend las envía sin zona y aquí se
// interpretan con las partes del string, nunca con new Date(str):
//   - new Date('2026-10-07') se interpreta como UTC → 6 oct 18:00
//     en Managua (un día menos).
//   - new Date('...Z') desplaza la hora según la zona del navegador.
//
// Los instantes reales (created_at, issued_at, last_login) SÍ llegan
// con Z desde TIMESTAMPTZ: para esos se usa parseInstante().
//
// Fuera de este archivo, ESLint prohíbe toISOString, getUTC* y
// Date.parse (ver eslint.config.js).
// ============================================================

const LOCALE = 'es-NI';

// YYYY-MM-DD[THH:mm[:ss[.fff]]] + zona opcional (Z o ±HH:MM)
const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/;

const p2 = (n) => String(n).padStart(2, '0');

/**
 * Convierte un string de fecha/hora de la clínica en un Date local,
 * usando sus partes: new Date(año, mes - 1, día, h, m, s).
 * Si el string trae zona (Z o ±HH:MM), esa zona se ignora y en
 * desarrollo se avisa: el campo probablemente es sospechoso.
 *
 * @param {string} str - "2026-10-07" o "2026-10-07T08:00:00"
 * @param {string} [campo] - nombre del campo, solo para el aviso
 * @returns {Date|null}
 */
export const parseFechaLocal = (str, campo = 'fecha') => {
  if (!str) return null;
  const m = String(str).match(FECHA_ISO);
  if (!m) {
    if (import.meta.env.DEV) console.error(`[fechas] ${campo} no es una fecha ISO válida:`, str);
    return null;
  }
  const [, y, mo, d, h = 0, mi = 0, s = 0, zona] = m;
  if (zona && import.meta.env.DEV) {
    console.error(
      `[fechas] ${campo} llegó con zona (${zona}): "${str}". `
      + 'Las fechas de la clínica deben venir sin zona; se usa la hora de pared tal cual.',
    );
  }
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
};

/**
 * Para instantes reales (TIMESTAMPTZ: created_at, issued_at...).
 * Esos SÍ traen Z y deben convertirse a la zona del navegador.
 */
export const parseInstante = (str) => (str ? new Date(str) : null);

/**
 * Serializa un Date a hora de pared 'YYYY-MM-DDTHH:mm:ss', sin zona.
 * Es lo que espera el backend en scheduled_at y en los filtros.
 */
export const aHoraLocal = (date) =>
  `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}`
  + `T${p2(date.getHours())}:${p2(date.getMinutes())}:${p2(date.getSeconds())}`;

/** Fecha de hoy en el navegador, 'YYYY-MM-DD'. */
export const hoyLocal = () => aHoraLocal(new Date()).slice(0, 10);

/** Suma días a una fecha 'YYYY-MM-DD' y devuelve otra 'YYYY-MM-DD'. */
export const sumarDias = (fecha, dias) => {
  const date = parseFechaLocal(fecha);
  date.setDate(date.getDate() + dias);
  return aHoraLocal(date).slice(0, 10);
};

/** Suma minutos a una hora de pared y devuelve otra hora de pared. */
export const sumarMinutos = (str, minutos) => {
  const date = parseFechaLocal(str);
  date.setMinutes(date.getMinutes() + minutos);
  return aHoraLocal(date);
};

// Acepta un string de la clínica o un Date ya construido
const aDate = (valor) => (valor instanceof Date ? valor : parseFechaLocal(valor));

/**
 * Hora legible. Por defecto 24 h ("14:30"); con { hour12: true }
 * devuelve "2:30 PM".
 */
export const formatHora = (valor, { hour12 = false } = {}) => {
  const date = aDate(valor);
  if (!date) return '—';
  if (!hour12) return `${p2(date.getHours())}:${p2(date.getMinutes())}`;
  const periodo = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${date.getHours() % 12 || 12}:${p2(date.getMinutes())} ${periodo}`;
};

/**
 * Fecha legible en español. Por defecto "7 de octubre de 2026";
 * las opciones son las de Intl.DateTimeFormat.
 */
export const formatFecha = (
  valor,
  opciones = { day: 'numeric', month: 'long', year: 'numeric' },
) => {
  const date = aDate(valor);
  if (!date) return '—';
  return date.toLocaleDateString(LOCALE, opciones);
};

/** Fecha y hora legibles: "7 oct 2026, 08:00". */
export const formatFechaHora = (valor) => {
  const date = aDate(valor);
  if (!date) return '—';
  return `${formatFecha(date, { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatHora(date)}`;
};
