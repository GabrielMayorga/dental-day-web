// src/utils/auditoria.js
// ============================================================
// Presentación del registro de auditoría: el backend guarda
// códigos (HISTORIA_CONSULTADA, patients, is_active...) y aquí
// se traducen a español legible.
//
// El catálogo es espejo de src/shared/audit/acciones.js del
// backend: si se agrega una acción allá, agregarla aquí.
// ============================================================
import { formatFecha, formatFechaHora, parseInstante } from './fechas';
import { translateStatus } from './appointmentStatus';

// ── Tipos de acción y su color ───────────────────────────────
// lectura = azul, creación = verde, edición = ámbar,
// riesgo (desactivaciones, logins fallidos) = rojo,
// acceso (login correcto) = gris neutro.
export const TIPOS = {
  lectura:  { label: 'Lectura',  light: '#2563EB', dark: '#60A5FA' },
  creacion: { label: 'Creación', light: '#1D9E75', dark: '#34D399' },
  edicion:  { label: 'Edición',  light: '#B45309', dark: '#FBBF24' },
  riesgo:   { label: 'Riesgo',   light: '#DC2626', dark: '#F87171' },
  acceso:   { label: 'Acceso',   light: '#5A6B85', dark: '#9DA7B3' },
};

// Etiqueta (en pasado, desde quien la hizo) y tipo de cada acción
export const ACCIONES = {
  LOGIN_EXITOSO:           { label: 'Inició sesión',                         tipo: 'acceso' },
  LOGIN_FALLIDO:           { label: 'Intento de inicio de sesión fallido',   tipo: 'riesgo' },
  HISTORIA_CREADA:         { label: 'Creó una historia clínica',             tipo: 'creacion' },
  HISTORIA_EDITADA:        { label: 'Editó una historia clínica',            tipo: 'edicion' },
  HISTORIA_CONSULTADA:     { label: 'Consultó una historia clínica',         tipo: 'lectura' },
  PACIENTE_CREADO:         { label: 'Registró un paciente',                  tipo: 'creacion' },
  PACIENTE_EDITADO:        { label: 'Editó un paciente',                     tipo: 'edicion' },
  PACIENTE_DESACTIVADO:    { label: 'Desactivó un paciente',                 tipo: 'riesgo' },
  USUARIO_CREADO:          { label: 'Creó un usuario',                       tipo: 'creacion' },
  USUARIO_ROL_CAMBIADO:    { label: 'Cambió el rol de un usuario',           tipo: 'edicion' },
  USUARIO_ESTADO_CAMBIADO: { label: 'Cambió el estado de un usuario',        tipo: 'edicion' },
  CITA_CREADA:             { label: 'Agendó una cita',                       tipo: 'creacion' },
  CITA_ESTADO_CAMBIADO:    { label: 'Cambió el estado de una cita',          tipo: 'edicion' },
  CITA_REPROGRAMADA:       { label: 'Reprogramó una cita',                   tipo: 'edicion' },
};

/**
 * Etiqueta y tipo de una fila concreta. Algunas acciones se precisan
 * con sus valores: una consulta sin registro es de un listado, y un
 * cambio de estado de usuario a inactivo es una desactivación.
 */
export const describirAccion = (log) => {
  const base = ACCIONES[log.action] ?? { label: log.action, tipo: 'acceso' };

  if (log.action === 'HISTORIA_CONSULTADA' && !log.record_id) {
    return log.new_values?.patient_id
      ? { ...base, label: 'Consultó las historias de un paciente' }
      : { ...base, label: 'Consultó las historias recientes' };
  }
  if (log.action === 'USUARIO_ESTADO_CAMBIADO' && log.new_values?.is_active === false) {
    return { label: 'Desactivó un usuario', tipo: 'riesgo' };
  }
  if (log.action === 'USUARIO_ESTADO_CAMBIADO' && log.new_values?.is_active === true) {
    return { ...base, label: 'Reactivó un usuario' };
  }
  return base;
};

// ── Tablas ───────────────────────────────────────────────────
export const TABLAS = {
  patients:         'Paciente',
  clinical_records: 'Historia clínica',
  users:            'Usuario',
  appointments:     'Cita',
};

export const nombreTabla = (tabla) => TABLAS[tabla] ?? tabla;

// Primeros 8 caracteres del UUID: suficiente para distinguir a simple vista
export const idCorto = (id) => (id ? id.slice(0, 8) : '');

// ── Campos ───────────────────────────────────────────────────
const CAMPOS = {
  email: 'Correo',
  full_name: 'Nombre completo',
  first_name: 'Nombre',
  last_name: 'Apellido',
  role: 'Rol',
  is_active: 'Estado',
  speciality: 'Especialidad',
  status: 'Estado de la cita',
  scheduled_at: 'Fecha y hora',
  duration_minutes: 'Duración',
  reason: 'Motivo',
  cancelled_reason: 'Motivo de cancelación',
  birth_date: 'Fecha de nacimiento',
  gender: 'Género',
  phone: 'Teléfono',
  address: 'Dirección',
  city: 'Ciudad',
  emergency_contact_name: 'Contacto de emergencia',
  emergency_contact_phone: 'Teléfono de emergencia',
  blood_type: 'Tipo de sangre',
  allergies: 'Alergias',
  chief_complaint: 'Motivo de consulta',
  diagnosis: 'Diagnóstico',
  treatment_plan: 'Plan de tratamiento',
  notes: 'Notas',
  created_at: 'Creado',
  id: 'ID',
  patient_id: 'Paciente (ID)',
  staff_id: 'Odontólogo (ID)',
  appointment_id: 'Cita (ID)',
  status_id: 'Estado (ID)',
  user_id: 'Usuario (ID)',
  created_by: 'Creado por (ID)',
};

export const nombreCampo = (campo) => CAMPOS[campo] ?? campo;

// Ordena los campos como en CAMPOS (el JSONB no guarda el orden);
// los desconocidos van al final.
const ORDEN = Object.keys(CAMPOS);
const posicion = (campo) => (ORDEN.includes(campo) ? ORDEN.indexOf(campo) : ORDEN.length);
export const ordenarCampos = (campos) => [...campos].sort((a, b) => posicion(a) - posicion(b));

const ROLES = { admin: 'Administrador', dentist: 'Odontólogo', receptionist: 'Recepcionista' };
const GENEROS = { male: 'Masculino', female: 'Femenino', other: 'Otro', prefer_not_to_say: 'Prefiere no decir' };

/**
 * Valor legible de un campo. Las fechas pasan por src/utils/fechas.js:
 * created_at es un instante (trae Z), scheduled_at es hora de pared y
 * birth_date es una fecha de calendario.
 */
export const formatValor = (campo, valor) => {
  if (valor === null || valor === undefined || valor === '') return '—';

  switch (campo) {
    case 'is_active':        return valor ? 'Activo' : 'Inactivo';
    case 'role':             return ROLES[valor] ?? valor;
    case 'gender':           return GENEROS[valor] ?? valor;
    case 'status':           return translateStatus(valor);
    case 'duration_minutes': return `${valor} min`;
    case 'created_at':       return formatFechaHora(parseInstante(valor));
    case 'scheduled_at':     return formatFechaHora(valor);
    case 'birth_date':       return formatFecha(valor);
    default: break;
  }

  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};
