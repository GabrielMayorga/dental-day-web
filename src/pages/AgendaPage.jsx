// src/pages/AgendaPage.jsx
// ============================================================
// Pantalla de Agenda. Muestra las citas en un calendario
// semanal/diario/mensual usando FullCalendar.
// Permite crear citas haciendo clic o arrastrando en un hueco.
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, FormControl,
  InputLabel, Select, MenuItem, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, Stack, Autocomplete,
  Chip, Divider,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAppointments, createAppointment, changeAppointmentStatus } from '../api/appointments';
import { getDentists } from '../api/staff';
import { getPatients } from '../api/patients';
import { getTreatments } from '../api/treatments';
import { useColorMode } from '../context/ThemeContext';
import '../styles/calendar.css';
import { translateStatus } from '../utils/appointmentStatus';

// ── Helpers ──────────────────────────────────────────────────

// Suma minutos a un string ISO y devuelve otro string ISO
const addMinutes = (isoString, minutes) => {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};

// Transforma una cita del backend al formato que espera FullCalendar
const toCalendarEvent = (cita) => ({
  id: String(cita.id),
  title: `${cita.patient_name} — ${cita.reason || translateStatus(cita.status_name)}`,
  start: cita.scheduled_at,
  end: addMinutes(cita.scheduled_at, cita.duration_minutes),
  backgroundColor: cita.status_color,
  borderColor: cita.status_color,
  textColor: '#ffffff',
  extendedProps: {
    staffName: cita.staff_name,
    statusName: translateStatus(cita.status_name),
    status_name: cita.status_name,   // nombre técnico (scheduled, confirmed, …) para lógica de transiciones
    statusColor: cita.status_color,
    staff_id: cita.staff_id,
    patient_id: cita.patient_id,
    patient_name: cita.patient_name,
    reason: cita.reason,
    duration_minutes: cita.duration_minutes,
  },
});

// Convierte el dateStr de FullCalendar al formato del input datetime-local
// Ejemplo: "2026-06-25T11:00:00" → "2026-06-25T11:00"
const toDateTimeLocal = (isoStr) => (isoStr ? isoStr.substring(0, 16) : '');

// Convierte el valor del input datetime-local al ISO que espera el backend
// Ejemplo: "2026-06-25T11:00" → "2026-06-25T11:00:00"
const toScheduledAt = (dtLocal) => (dtLocal ? `${dtLocal}:00` : '');

// Formatea un ISO a fecha legible en español: "miércoles, 25 de junio de 2026"
const formatDateES = (isoStr) =>
  new Date(isoStr).toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

// Formatea un ISO a hora en formato 24 h: "14:30"
const formatTimeES = (isoStr) =>
  new Date(isoStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

// ── Localización en español ───────────────────────────────────
// FullCalendar no incluye locales en el paquete base; se
// configuran manualmente con buttonText y dayHeaderFormat.
const calendarLocaleES = {
  locale: 'es',
  buttonText: {
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
  },
  allDayText: 'Todo el día',
  moreLinkText: 'más',
};


// Valores iniciales del formulario de nueva cita
const FORM_EMPTY = {
  patient_id: '',
  staff_id: '',
  scheduled_at: '',   // valor para <input type="datetime-local"> (sin segundos)
  treatment_id: '',
  reason: '',
};

// ── Componente principal ──────────────────────────────────────
export default function AgendaPage() {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // ── Estilos glass — dependen del modo ────────────────────────
  const glassPaperSx = {
    background: isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(10,31,68,0.10)',
    borderRadius: 3,
    p: { xs: 2, md: 3 },
  };

  const dialogPaperSx = {
    background: isDark ? 'rgba(22,27,34,0.92)' : 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(10,31,68,0.10)',
    borderRadius: '16px',
    minWidth: { xs: '90vw', sm: '480px' },
  };

  // ── Estado del calendario ──────────────────────────────────
  const [events, setEvents] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');   // '' = Todos
  const [loading, setLoading] = useState(true);

  // ── Estado del diálogo de detalle de cita ─────────────────
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Estado del cambio de estado de cita ───────────────────
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError]       = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason]     = useState('');

  // ── Estado del diálogo de nueva cita ──────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [treatments, setTreatments] = useState([]);
  const [form, setForm] = useState(FORM_EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Autocomplete de paciente
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientInput, setPatientInput] = useState('');
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const patientDebounce = useRef(null);

  // Evita recargar tratamientos si ya se cargaron
  const catalogsLoaded = useRef(false);

  // Referencia al calendario para llamar unselect() tras arrastrar
  const calendarRef = useRef(null);

  // ── Carga de catálogos ─────────────────────────────────────

  // Odontólogos: se cargan al montar (también alimentan el filtro superior)
  useEffect(() => {
    getDentists()
      .then(setDentists)
      .catch(() => setDentists([]));
  }, []);

  // Tratamientos: se cargan la primera vez que se abre el diálogo
  const loadCatalogs = useCallback(async () => {
    if (catalogsLoaded.current) return;
    catalogsLoaded.current = true;
    try {
      const treats = await getTreatments();
      setTreatments(treats);
    } catch {
      // El select quedará vacío; el usuario puede cerrar y reintentar
    }
  }, []);

  // Búsqueda de pacientes con debounce: llama al servidor tras 400 ms de inactividad
  const searchPatients = useCallback((text) => {
    clearTimeout(patientDebounce.current);
    patientDebounce.current = setTimeout(async () => {
      setPatientLoading(true);
      try {
        const results = await getPatients(text);
        setPatientOptions(results);
      } catch {
        setPatientOptions([]);
      } finally {
        setPatientLoading(false);
      }
    }, 400);
  }, []);

  // ── Carga de citas ─────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedStaff ? { staffId: selectedStaff } : {};
      const citas = await getAppointments(params);
      setEvents(citas.map(toCalendarEvent));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStaff]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Handlers del calendario ────────────────────────────────

  // Abre el diálogo prellenando la fecha/hora del hueco indicado
  const openDialog = useCallback((dateStr) => {
    setForm({ ...FORM_EMPTY, scheduled_at: toDateTimeLocal(dateStr) });
    setFormError('');
    setSelectedPatient(null);
    setPatientInput('');
    setPatientOptions([]);
    loadCatalogs();
    setDialogOpen(true);
  }, [loadCatalogs]);

  // Clic simple en un slot vacío
  const handleDateClick = useCallback((info) => {
    openDialog(info.dateStr);
  }, [openDialog]);

  // Arrastre para seleccionar un rango; usamos el inicio del rango
  const handleSelect = useCallback((info) => {
    openDialog(info.startStr);
    // Quita el resaltado de selección del calendario
    calendarRef.current?.getApi().unselect();
  }, [openDialog]);

  // Clic en una cita existente: abre el diálogo de detalle
  const handleEventClick = useCallback((info) => {
    setSelectedEvent(info.event);
    setDetailOpen(true);
  }, []);

  // Limpia el estado de cambio de estado cuando se selecciona una cita diferente
  useEffect(() => {
    setStatusError('');
    setShowCancelForm(false);
    setCancelReason('');
    setStatusChanging(false);
  }, [selectedEvent]);

  // Cierra el diálogo de detalle y reinicia el estado de cambio de estado
  const handleDetailClose = useCallback(() => {
    if (statusChanging) return;
    setDetailOpen(false);
    setStatusError('');
    setShowCancelForm(false);
    setCancelReason('');
  }, [statusChanging]);

  // Cambia el estado de la cita seleccionada, luego cierra y recarga
  const handleStatusChange = useCallback(async (newStatus, reason) => {
    setStatusChanging(true);
    setStatusError('');
    try {
      await changeAppointmentStatus(selectedEvent.id, newStatus, reason);
      handleDetailClose();
      await fetchEvents();
    } catch (err) {
      setStatusError(
        err.response?.data?.error || 'Error al cambiar el estado. Inténtalo de nuevo.',
      );
    } finally {
      setStatusChanging(false);
    }
  }, [selectedEvent, handleDetailClose, fetchEvents]);

  // Abre el formulario de nueva cita prellenado con datos de la cita original.
  // Solo disponible para citas canceladas o con estado 'no_show'.
  // La cita original NO se modifica; únicamente se crea una nueva.
  const handleReschedule = useCallback(() => {
    const ep = selectedEvent.extendedProps;

    // Cierra el diálogo de detalle sin alterar la cita existente
    setDetailOpen(false);
    setStatusError('');
    setShowCancelForm(false);
    setCancelReason('');

    // Objeto paciente sintético para que el Autocomplete muestre el nombre guardado
    // sin necesidad de hacer una búsqueda previa al servidor.
    const syntheticPatient = {
      id:         ep.patient_id,
      first_name: ep.patient_name || '',
      last_name:  '',
    };

    // Prellena el formulario: paciente y odontólogo de la cita original,
    // motivo conservado si existía. El usuario elige nueva fecha y tratamiento.
    setForm({
      ...FORM_EMPTY,
      patient_id: ep.patient_id,
      staff_id:   ep.staff_id,
      reason:     ep.reason || '',
    });
    setFormError('');

    // Inyecta el paciente sintético en el Autocomplete para evitar el warning
    // de MUI sobre un valor seleccionado que no está en las opciones.
    setSelectedPatient(syntheticPatient);
    setPatientInput(ep.patient_name || '');
    setPatientOptions([syntheticPatient]);

    loadCatalogs();
    setDialogOpen(true);
  }, [selectedEvent, loadCatalogs]);

  // ── Handlers del formulario ────────────────────────────────

  // Devuelve un handler onChange para cualquier campo del formulario
  const handleFormChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleClose = () => {
    if (saving) return;   // evita cerrar mientras se guarda
    setDialogOpen(false);
    setFormError('');
  };

  const handleSave = async () => {
    // Validación mínima de campos obligatorios
    if (!form.patient_id || !form.staff_id || !form.scheduled_at || !form.treatment_id) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await createAppointment({
        patient_id: form.patient_id,
        staff_id: form.staff_id,
        scheduled_at: toScheduledAt(form.scheduled_at),
        treatment_id: form.treatment_id,
        reason: form.reason || undefined,
      });
      // Éxito: cierra el diálogo y recarga las citas en el calendario
      setDialogOpen(false);
      await fetchEvents();
    } catch (err) {
      // Muestra el mensaje del backend (ej. 409 por solapamiento de horario)
      setFormError(
        err.response?.data?.error ||
        'Error al guardar la cita. Inténtalo de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} data-fc-mode={mode}>
      {/* Encabezado */}
      <Typography variant="h5" sx={{ color: 'text.primary', mb: 3 }}>
        Agenda
      </Typography>

      {/* Filtro de odontólogo */}
      <FormControl size="small" sx={{ mb: 3, minWidth: 240 }}>
        <InputLabel>Odontólogo</InputLabel>
        <Select
          label="Odontólogo"
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
        >
          <MenuItem value="">Todos</MenuItem>
          {dentists.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Calendario o spinner de carga */}
      <Paper elevation={0} sx={glassPaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'secondary.main' }} />
          </Box>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay,dayGridMonth',
            }}
            {...calendarLocaleES}
            nowIndicator={true}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="18:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            expandRows={true}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            events={events}
            height="auto"
            weekends
            selectable
            selectMirror
            dateClick={handleDateClick}
            select={handleSelect}
            eventClick={handleEventClick}
          />
        )}
      </Paper>

      {/* ── Diálogo: detalle de cita existente ──────────────── */}
      {selectedEvent && (() => {
        const ep = selectedEvent.extendedProps;
        // Busca el dentista completo en la lista; fallback al nombre guardado
        const dentist = dentists.find((d) => String(d.id) === String(ep.staff_id));

        return (
          <Dialog
            open={detailOpen}
            onClose={handleDetailClose}
            PaperProps={{ sx: dialogPaperSx }}
          >
            <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, pb: 0.5 }}>
              {ep.patient_name || selectedEvent.title}
            </DialogTitle>

            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 1 }}>

                {/* Fecha y hora */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha y hora
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {formatDateES(selectedEvent.startStr)} · {formatTimeES(selectedEvent.startStr)}
                  </Typography>
                </Box>

                {/* Duración */}
                {ep.duration_minutes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Duración
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {ep.duration_minutes} min
                    </Typography>
                  </Box>
                )}

                {/* Estado con chip de color */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Estado
                  </Typography>
                  <Chip
                    label={ep.statusName}
                    size="small"
                    sx={{
                      backgroundColor: ep.statusColor || '#2563EB',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  />
                </Box>

                {/* Motivo */}
                {ep.reason && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Motivo
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                      {ep.reason}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                {/* Sección odontólogo */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: '#2563EB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Odontólogo
                  </Typography>
                  {dentist ? (
                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {dentist.first_name} {dentist.last_name}
                      </Typography>
                      {dentist.speciality && (
                        <Typography variant="body2" color="text.secondary">
                          {dentist.speciality}
                        </Typography>
                      )}
                      {dentist.email && (
                        <Typography variant="body2" color="text.secondary">
                          {dentist.email}
                        </Typography>
                      )}
                      {dentist.phone && (
                        <Typography variant="body2" color="text.secondary">
                          {dentist.phone}
                        </Typography>
                      )}
                    </Stack>
                  ) : (
                    // Fallback: al menos el nombre guardado en la cita
                    <Typography variant="body1" sx={{ color: 'text.primary', mt: 0.5 }}>
                      {ep.staffName || '—'}
                    </Typography>
                  )}
                </Box>

                {/* ── Sección: cambiar estado ─────────────────────── */}
                <Box>
                  <Divider sx={{ mb: 1.5 }} />

                  {/* Estados finales: no hay acciones posibles */}
                  {['completed', 'cancelled', 'no_show'].includes(ep.status_name) ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Esta cita está en un estado final.
                    </Typography>
                  ) : (
                    <>
                      {/* Encabezado con spinner mientras se procesa */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{ color: '#2563EB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          Cambiar estado
                        </Typography>
                        {statusChanging && <CircularProgress size={13} thickness={5} />}
                      </Box>

                      {/* Error al cambiar estado */}
                      {statusError && (
                        <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>
                          {statusError}
                        </Alert>
                      )}

                      {/* Botones de transición según el estado actual */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>

                        {/* scheduled → confirmed */}
                        {ep.status_name === 'scheduled' && (
                          <Button
                            size="small" variant="outlined" disabled={statusChanging}
                            onClick={() => handleStatusChange('confirmed')}
                            sx={{ borderColor: '#16a34a', color: '#16a34a', borderRadius: '8px',
                              '&:hover': { backgroundColor: '#16a34a14', borderColor: '#16a34a' } }}
                          >
                            Confirmar
                          </Button>
                        )}

                        {/* confirmed → in_progress */}
                        {ep.status_name === 'confirmed' && (
                          <Button
                            size="small" variant="outlined" disabled={statusChanging}
                            onClick={() => handleStatusChange('in_progress')}
                            sx={{ borderColor: '#0284c7', color: '#0284c7', borderRadius: '8px',
                              '&:hover': { backgroundColor: '#0284c714', borderColor: '#0284c7' } }}
                          >
                            Iniciar consulta
                          </Button>
                        )}

                        {/* in_progress → completed */}
                        {ep.status_name === 'in_progress' && (
                          <Button
                            size="small" variant="outlined" disabled={statusChanging}
                            onClick={() => handleStatusChange('completed')}
                            sx={{ borderColor: '#16a34a', color: '#16a34a', borderRadius: '8px',
                              '&:hover': { backgroundColor: '#16a34a14', borderColor: '#16a34a' } }}
                          >
                            Completar
                          </Button>
                        )}

                        {/* scheduled / confirmed → no_show */}
                        {['scheduled', 'confirmed'].includes(ep.status_name) && (
                          <Button
                            size="small" variant="outlined" disabled={statusChanging}
                            onClick={() => handleStatusChange('no_show')}
                            sx={{ borderColor: '#d97706', color: '#d97706', borderRadius: '8px',
                              '&:hover': { backgroundColor: '#d9770614', borderColor: '#d97706' } }}
                          >
                            No asistió
                          </Button>
                        )}

                        {/* scheduled / confirmed → cancelled (requiere motivo opcional) */}
                        {['scheduled', 'confirmed'].includes(ep.status_name) && (
                          <Button
                            size="small" variant="outlined" disabled={statusChanging}
                            onClick={() => setShowCancelForm((p) => !p)}
                            sx={{ borderColor: '#dc2626', color: '#dc2626', borderRadius: '8px',
                              '&:hover': { backgroundColor: '#dc262614', borderColor: '#dc2626' } }}
                          >
                            Cancelar cita
                          </Button>
                        )}
                      </Box>

                      {/* Formulario de motivo de cancelación */}
                      {showCancelForm && (
                        <Stack spacing={1} sx={{ mt: 1.5 }}>
                          <TextField
                            label="Motivo de cancelación (opcional)"
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            disabled={statusChanging}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            disabled={statusChanging}
                            onClick={() => handleStatusChange('cancelled', cancelReason || undefined)}
                            sx={{
                              alignSelf: 'flex-start',
                              backgroundColor: '#dc2626',
                              '&:hover': { backgroundColor: '#b91c1c' },
                              borderRadius: '8px',
                            }}
                          >
                            {statusChanging ? 'Procesando…' : 'Confirmar cancelación'}
                          </Button>
                        </Stack>
                      )}
                    </>
                  )}
                </Box>

              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              {/* Botón "Reprogramar" — visible solo para citas canceladas o no asistidas */}
              {['cancelled', 'no_show'].includes(ep.status_name) && (
                <Button
                  onClick={handleReschedule}
                  variant="outlined"
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#2563EB',
                    color: '#2563EB',
                    mr: 'auto',
                    '&:hover': { backgroundColor: '#2563EB14', borderColor: '#2563EB' },
                  }}
                >
                  Reprogramar
                </Button>
              )}
              <Button
                onClick={handleDetailClose}
                disabled={statusChanging}
                variant="contained"
                sx={{ borderRadius: '8px', backgroundColor: '#2563EB', '&:hover': { backgroundColor: '#1d4ed8' } }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* ── Diálogo: formulario de nueva cita ────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 600, pb: 1 }}>
          Nueva cita
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Mensaje de error del backend */}
            {formError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {formError}
              </Alert>
            )}

            {/* Paciente — búsqueda asíncrona en el servidor */}
            <Autocomplete
              size="small"
              fullWidth
              options={patientOptions}
              value={selectedPatient}
              inputValue={patientInput}
              loading={patientLoading}
              noOptionsText={patientInput.length === 0 ? 'Escribe para buscar' : 'Sin resultados'}
              filterOptions={(x) => x}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onInputChange={(_, newInput) => {
                setPatientInput(newInput);
                searchPatients(newInput);
              }}
              onChange={(_, newValue) => {
                setSelectedPatient(newValue);
                setForm((prev) => ({ ...prev, patient_id: newValue?.id ?? '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Paciente *"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {patientLoading && <CircularProgress size={16} sx={{ mr: 1 }} />}
                        {params.InputProps?.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {/* Odontólogo */}
            <FormControl fullWidth size="small">
              <InputLabel>Odontólogo *</InputLabel>
              <Select
                label="Odontólogo *"
                value={form.staff_id}
                onChange={handleFormChange('staff_id')}
              >
                {dentists.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Fecha y hora — prellenada con el hueco clickeado */}
            <TextField
              label="Fecha y hora *"
              type="datetime-local"
              size="small"
              fullWidth
              value={form.scheduled_at}
              onChange={handleFormChange('scheduled_at')}
              InputLabelProps={{ shrink: true }}
            />

            {/* Tratamiento */}
            <FormControl fullWidth size="small">
              <InputLabel>Tratamiento *</InputLabel>
              <Select
                label="Tratamiento *"
                value={form.treatment_id}
                onChange={handleFormChange('treatment_id')}
              >
                {treatments.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Motivo (opcional) */}
            <TextField
              label="Motivo (opcional)"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={form.reason}
              onChange={handleFormChange('reason')}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleClose}
            disabled={saving}
            sx={{ color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            sx={{ borderRadius: '8px' }}
          >
            {saving ? 'Guardando…' : 'Guardar cita'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
