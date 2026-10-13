// src/utils/disponibilidad.js
// ============================================================
// Cálculo de horarios disponibles para una cita. Lógica pura:
// sin React ni red, para poder razonarla y probarla aparte.
//
// El criterio de "ocupado" replica EXACTAMENTE la restricción
// no_overlapping_appointments de la base (001_initial_schema.sql):
//
//   EXCLUDE USING gist (staff_id WITH =,
//     tsrange(scheduled_at, scheduled_at + duración, '[)') WITH &&)
//
// - Intervalos semiabiertos [inicio, fin): una cita que termina a
//   las 9:30 no choca con otra que empieza a las 9:30.
// - La restricción no tiene WHERE: TODAS las citas ocupan su
//   horario, incluidas las canceladas y las no asistidas. Aquí
//   tampoco se filtra por estado.
// ============================================================
import { parseFechaLocal, aHoraLocal } from './fechas';

const MINUTO = 60 * 1000;

const p2 = (n) => String(n).padStart(2, '0');

// '08:30' → 510
const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// 510 → '08:30'
const deMinutos = (min) => `${p2(Math.floor(min / 60))}:${p2(min % 60)}`;

/** Hora sin cero inicial para textos: '09:00' o un Date → '9:00'. */
export const horaCorta = (valor) => {
  const hhmm = valor instanceof Date ? aHoraLocal(valor).slice(11, 16) : valor;
  const [h, m] = hhmm.split(':');
  return `${Number(h)}:${m}`;
};

/** true si la clínica atiende la fecha 'YYYY-MM-DD'. */
export const esDiaHabil = (fecha, horario) => {
  const date = parseFechaLocal(fecha);
  return Boolean(date) && horario.dias.includes(date.getDay());
};

/**
 * Calcula el estado de cada horario de un día para un odontólogo.
 *
 * @param {object} p
 * @param {string} p.fecha        - 'YYYY-MM-DD'
 * @param {number} p.duracionMin  - duración de la cita a agendar
 * @param {Array}  p.citas        - citas del odontólogo (scheduled_at, duration_minutes)
 * @param {Date}   p.ahora        - instante actual (inyectado para poder probar)
 * @param {object} p.horario      - { dias, apertura, cierre, intervaloMinutos }
 * @returns {Array<{ hora: string, estado: 'libre'|'ocupado'|'fuera_de_horario'|'pasado',
 *                   conflicto?: { inicio: string, fin: string } }>}
 *          Lista vacía si la clínica no atiende ese día.
 */
export const calcularHorarios = ({ fecha, duracionMin, citas = [], ahora = new Date(), horario }) => {
  if (!esDiaHabil(fecha, horario)) return [];

  const apertura = aMinutos(horario.apertura);
  const cierre = aMinutos(horario.cierre);
  const paso = horario.intervaloMinutos;

  // Rangos [inicio, fin) de las citas existentes, en milisegundos
  const rangos = citas
    .map((cita) => {
      const inicio = parseFechaLocal(cita.scheduled_at, 'scheduled_at');
      if (!inicio) return null;
      return {
        inicio: inicio.getTime(),
        fin: inicio.getTime() + cita.duration_minutes * MINUTO,
      };
    })
    .filter(Boolean);

  const horarios = [];
  for (let min = apertura; min < cierre; min += paso) {
    const hora = deMinutos(min);
    const inicio = parseFechaLocal(`${fecha}T${hora}`).getTime();
    const fin = inicio + duracionMin * MINUTO;

    if (inicio < ahora.getTime()) {
      horarios.push({ hora, estado: 'pasado' });
      continue;
    }

    // Mismo operador && de tsrange con '[)': a.inicio < b.fin && b.inicio < a.fin
    const choque = rangos.find((r) => inicio < r.fin && r.inicio < fin);
    if (choque) {
      horarios.push({
        hora,
        estado: 'ocupado',
        conflicto: {
          inicio: aHoraLocal(new Date(choque.inicio)).slice(11, 16),
          fin: aHoraLocal(new Date(choque.fin)).slice(11, 16),
        },
      });
      continue;
    }

    if (min + duracionMin > cierre) {
      horarios.push({ hora, estado: 'fuera_de_horario' });
      continue;
    }

    horarios.push({ hora, estado: 'libre' });
  }
  return horarios;
};
