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

// Colores de cada estado, espejo de appointment_statuses en la BD
// (seeds/001_seed_data.sql). Se usan cuando el backend no devuelve
// status_color, p. ej. en la respuesta de PATCH /appointments/:id/status.
export const STATUS_COLORS = {
  scheduled:   '#3B82F6',
  confirmed:   '#10B981',
  in_progress: '#F59E0B',
  completed:   '#6B7280',
  cancelled:   '#EF4444',
  no_show:     '#DC2626',
};
