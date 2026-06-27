// src/utils/appointmentStatus.js
// ============================================================
// Traducción de los estados de cita (nombre técnico → español).
// La BD guarda el nombre en inglés; aquí lo mostramos en español.
// ============================================================

export const STATUS_LABELS = {
  scheduled:   'Programada',
  confirmed:   'Confirmada',
  in_progress: 'En consulta',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No asistió',
};

// Devuelve la etiqueta en español, o el nombre original si no está mapeado
export const translateStatus = (statusName) =>
  STATUS_LABELS[statusName] || statusName;
