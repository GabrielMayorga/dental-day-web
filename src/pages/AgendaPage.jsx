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
  Button, TextField, Alert, Stack, Snackbar,
  Chip, Divider, useTheme, useMediaQuery,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAppointments, changeAppointmentStatus } from '../api/appointments';
import { getDentists } from '../api/staff';
import { useColorMode } from '../context/ThemeContext';
import '../styles/calendar.css';
import { translateStatus } from '../utils/appointmentStatus';
import { CalendarSkeleton } from '../components/Skeletons';
import { aHoraLocal, sumarMinutos, formatFecha, formatHora } from '../utils/fechas';
import { horaCorta } from '../utils/disponibilidad';
import NuevaCitaDialog from '../components/cita/NuevaCitaDialog';
import { diaCorto } from '../components/cita/comun';

// ── Helpers ──────────────────────────────────────────────────

// Transforma una cita del backend al formato que espera FullCalendar
const toCalendarEvent = (cita) => ({
  id: String(cita.id),
  title: `${cita.patient_name} — ${cita.reason || translateStatus(cita.status_name)}`,
  start: cita.scheduled_at,
  end: sumarMinutos(cita.scheduled_at, cita.duration_minutes),
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

// Variante móvil: etiqueta de "Semana" acortada para que la barra
// de botones quepa en pantallas angostas
const calendarLocaleESMobile = {
  ...calendarLocaleES,
  buttonText: { ...calendarLocaleES.buttonText, week: 'Sem' },
};


// ── Componente principal ──────────────────────────────────────
export default function AgendaPage() {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // Detección de móvil (menor al breakpoint 'md') para alternar
  // vista inicial del calendario, toolbar, diálogos fullScreen, etc.
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    // En pantalla completa (móvil) no queremos esquinas redondeadas
    borderRadius: { xs: 0, md: '16px' },
    minWidth: { xs: '100%', sm: '480px' },
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
  // `key` cambia en cada apertura: el diálogo arranca con estado
  // limpio a partir de `inicial`.
  const [nuevaCita, setNuevaCita] = useState({ open: false, key: 0, inicial: {} });
  const [aviso, setAviso] = useState('');

  // Referencia al calendario para llamar unselect() tras arrastrar
  const calendarRef = useRef(null);

  // ── Carga de catálogos ─────────────────────────────────────

  // Odontólogos: se cargan al montar (también alimentan el filtro superior)
  useEffect(() => {
    getDentists()
      .then(setDentists)
      .catch(() => setDentists([]));
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

  const abrirNuevaCita = useCallback((inicial) => {
    setNuevaCita((n) => ({ open: true, key: n.key + 1, inicial }));
  }, []);

  // Abre el diálogo con el día y la hora del hueco indicado (en la
  // vista de mes, solo el día) y el odontólogo del filtro, si hay uno.
  const openDialog = useCallback((date, allDay) => {
    const local = aHoraLocal(date);
    abrirNuevaCita({
      fecha: local.slice(0, 10),
      hora: allDay ? null : local.slice(11, 16),
      staffId: selectedStaff || null,
    });
  }, [abrirNuevaCita, selectedStaff]);

  // Clic simple en un slot vacío
  const handleDateClick = useCallback((info) => {
    openDialog(info.date, info.allDay);
  }, [openDialog]);

  // Arrastre para seleccionar un rango; usamos el inicio del rango
  const handleSelect = useCallback((info) => {
    openDialog(info.start, info.allDay);
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

    // Paciente sintético con el nombre guardado en la cita, sin
    // necesidad de buscarlo antes en el servidor.
    const [nombre = '', ...apellidos] = (ep.patient_name || '').split(' ');
    const syntheticPatient = {
      id:         ep.patient_id,
      first_name: nombre,
      last_name:  apellidos.join(' '),
    };

    // Prellena paciente y odontólogo de la cita original, y el motivo
    // si existía. El usuario elige nueva fecha y tratamiento.
    abrirNuevaCita({
      paciente: syntheticPatient,
      staffId:  ep.staff_id,
      motivo:   ep.reason || '',
    });
  }, [selectedEvent, abrirNuevaCita]);

  // Cita creada: cierra, refresca el calendario y confirma
  const handleAgendada = useCallback(({ fecha, hora }) => {
    setNuevaCita((n) => ({ ...n, open: false }));
    setAviso(`Cita agendada para el ${diaCorto(fecha)} a las ${horaCorta(hora)}`);
    fetchEvents();
  }, [fetchEvents]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} data-fc-mode={mode}>
      {/* Encabezado */}
      <Typography
        variant="h5"
        sx={{ color: 'text.primary', mb: { xs: 2, md: 3 }, fontSize: { xs: '1.15rem', md: '1.5rem' } }}
      >
        Agenda
      </Typography>

      {/* Filtro de odontólogo: ancho completo en móvil */}
      <FormControl size="small" sx={{ mb: 3, minWidth: 240, width: { xs: '100%', md: 'auto' } }}>
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

      {/* Calendario o esqueleto de carga */}
      <Paper elevation={0} sx={glassPaperSx}>
        {loading ? (
          <CalendarSkeleton columns={isMobile ? 1 : 7} />
        ) : (
          <FullCalendar
            // La key fuerza un remontaje al cruzar el breakpoint móvil/escritorio
            // (por ejemplo al rotar o redimensionar), para que initialView tome efecto
            key={isMobile ? 'cal-mobile' : 'cal-desktop'}
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            // Explícito: las citas llegan como hora de pared sin zona y
            // se pintan tal cual en la hora local del navegador.
            timeZone="local"
            initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay,dayGridMonth',
            }}
            {...(isMobile ? calendarLocaleESMobile : calendarLocaleES)}
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
            fullScreen={isMobile}
            PaperProps={{ sx: dialogPaperSx }}
          >
            <DialogTitle sx={{ color: 'text.primary', fontWeight: 700, pb: 0.5, fontSize: { xs: 17, md: 20 } }}>
              {ep.patient_name || selectedEvent.title}
            </DialogTitle>

            <DialogContent sx={{ px: { xs: 2, md: 3 } }}>
              <Stack spacing={1.5} sx={{ mt: 1 }}>

                {/* Fecha y hora */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha y hora
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {formatFecha(selectedEvent.start, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {formatHora(selectedEvent.start)}
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

                      {/* Botones de transición según el estado actual.
                          En móvil se apilan a ancho completo para ser cómodos de tocar. */}
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: 1 }}>

                        {/* scheduled → confirmed */}
                        {ep.status_name === 'scheduled' && (
                          <Button
                            size="small" variant="outlined" disabled={statusChanging}
                            onClick={() => handleStatusChange('confirmed')}
                            sx={{ borderColor: '#16a34a', color: '#16a34a', borderRadius: '8px',
                              width: { xs: '100%', sm: 'auto' },
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
                              width: { xs: '100%', sm: 'auto' },
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
                              width: { xs: '100%', sm: 'auto' },
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
                              width: { xs: '100%', sm: 'auto' },
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
                              width: { xs: '100%', sm: 'auto' },
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
                              alignSelf: { xs: 'stretch', sm: 'flex-start' },
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

            {/* En móvil los botones se apilan a ancho completo con espaciado vertical */}
            <DialogActions
              sx={{
                px: { xs: 2, md: 3 },
                pb: { xs: 2, md: 2.5 },
                gap: 1,
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              {/* Botón "Reprogramar" — visible solo para citas canceladas o no asistidas */}
              {['cancelled', 'no_show'].includes(ep.status_name) && (
                <Button
                  onClick={handleReschedule}
                  variant="outlined"
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#2563EB',
                    color: '#2563EB',
                    mr: { sm: 'auto' },
                    width: { xs: '100%', sm: 'auto' },
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
                sx={{
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': { backgroundColor: '#1d4ed8' },
                }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* ── Diálogo: nueva cita ──────────────────────────────── */}
      <NuevaCitaDialog
        key={nuevaCita.key}
        open={nuevaCita.open}
        inicial={nuevaCita.inicial}
        dentists={dentists}
        onClose={() => setNuevaCita((n) => ({ ...n, open: false }))}
        onAgendada={handleAgendada}
      />

      <Snackbar
        open={Boolean(aviso)}
        autoHideDuration={5000}
        onClose={(_, reason) => reason !== 'clickaway' && setAviso('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setAviso('')} sx={{ borderRadius: '14px' }}>
          {aviso}
        </Alert>
      </Snackbar>
    </Box>
  );
}
