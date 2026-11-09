// src/pages/AgendaPage.jsx
// ============================================================
// Pantalla de Agenda. Muestra las citas en un calendario
// semanal/diario/mensual usando FullCalendar.
// Permite crear citas haciendo clic o arrastrando en un hueco.
//
// Presentación inspirada en el Calendario de Apple:
//   - Toolbar propia con título grande y selector segmentado.
//   - Filtro de odontólogos en píldoras (selección múltiple).
//   - Citas con relleno suave del color de su estado.
//   - Solo días y horas de atención (CLINICA.horario).
//   - En móvil: vista de día con tira de la semana arriba.
// ============================================================
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, CircularProgress, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, Stack, Snackbar,
  Chip, Divider, useTheme, useMediaQuery,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAppointments, changeAppointmentStatus } from '../api/appointments';
import { isForbidden } from '../api/client';
import { getDentists } from '../api/staff';
import { useColorMode } from '../context/ThemeContext';
import '../styles/calendar.css';
import { translateStatus, STATUS_LABELS, STATUS_COLORS } from '../utils/appointmentStatus';
import {
  aHoraLocal, hoyLocal, sumarMinutos, parseFechaLocal, formatFecha, formatHora,
} from '../utils/fechas';
import { horaCorta } from '../utils/disponibilidad';
import { colorOdontologo, inicialesOdontologo } from '../utils/odontologos';
import { CLINICA } from '../config/clinica';
import NuevaCitaDialog from '../components/cita/NuevaCitaDialog';
import { diaCorto } from '../components/cita/comun';
import AgendaToolbar from '../components/agenda/AgendaToolbar';
import FiltroOdontologos from '../components/agenda/FiltroOdontologos';
import EventoCita from '../components/agenda/EventoCita';
import SemanaMovil from '../components/agenda/SemanaMovil';

// ── Helpers ──────────────────────────────────────────────────

// Transforma una cita del backend al formato que espera FullCalendar.
// Los colores de fondo/borde van transparentes: el bloque lo dibuja
// EventoCita con el color del estado (status_color de la BD).
const toCalendarEvent = (cita) => ({
  id: String(cita.id),
  title: cita.patient_name,
  start: cita.scheduled_at,
  end: sumarMinutos(cita.scheduled_at, cita.duration_minutes),
  backgroundColor: 'transparent',
  borderColor: 'transparent',
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
    // Lo decide el backend; aquí no se recalcula la regla
    soloLectura: cita.puede_gestionar === false,
  },
});

const mayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Título de la toolbar según la vista: "Octubre 2026",
// "Oct – Nov 2026" o "Lunes 26 de octubre".
const tituloDe = (vista, inicio, finExclusivo) => {
  // Último día VISIBLE: el rango incluye el domingo aunque esté oculto
  const fin = new Date(finExclusivo);
  do { fin.setDate(fin.getDate() - 1); } while (DIAS_CERRADOS.includes(fin.getDay()) && fin > inicio);
  const anio = String(inicio.getFullYear());
  if (vista === 'timeGridDay') {
    return {
      principal: `${mayuscula(formatFecha(inicio, { weekday: 'long' }))} ${inicio.getDate()}`,
      secundario: `${formatFecha(inicio, { month: 'long' })} ${anio}`,
    };
  }
  if (vista === 'dayGridMonth') {
    // La cuadrícula de mes empieza en la semana anterior: el mes
    // real es el del día central del rango
    const medio = new Date((inicio.getTime() + fin.getTime()) / 2);
    return { principal: mayuscula(formatFecha(medio, { month: 'long' })), secundario: String(medio.getFullYear()) };
  }
  if (inicio.getMonth() === fin.getMonth()) {
    return { principal: mayuscula(formatFecha(inicio, { month: 'long' })), secundario: anio };
  }
  const corto = (d) => mayuscula(formatFecha(d, { month: 'short' }).replace('.', ''));
  return { principal: `${corto(inicio)} – ${corto(fin)}`, secundario: String(fin.getFullYear()) };
};

// Días que la clínica NO atiende (FullCalendar los oculta)
const DIAS_CERRADOS = [0, 1, 2, 3, 4, 5, 6].filter((d) => !CLINICA.horario.dias.includes(d));
const DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const ESTADOS_LEYENDA = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];


// ── Componente principal ──────────────────────────────────────
export default function AgendaPage() {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // Detección de móvil (menor al breakpoint 'md') para alternar
  // vista inicial del calendario, toolbar, diálogos fullScreen, etc.
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ── Superficie del calendario ────────────────────────────────
  // Sólida y sin desenfoque: el calendario es contenido, no una
  // capa flotante. El vidrio se reserva para la navegación.
  const surfaceSx = {
    background: isDark ? '#161B22' : '#FFFFFF',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(10,31,68,0.08)',
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
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
  const [dentists, setDentists] = useState([]);
  const [seleccion, setSeleccion] = useState([]);         // [] = todos los odontólogos
  const [rango, setRango] = useState(null);               // { from, to } visible
  const [vista, setVista] = useState(isMobile ? 'timeGridDay' : 'timeGridWeek');
  const [titulo, setTitulo] = useState({ principal: 'Agenda', secundario: '' });
  const [fechaVisible, setFechaVisible] = useState(hoyLocal());

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

  // Referencia al calendario para navegar y llamar unselect()
  const calendarRef = useRef(null);
  const api = () => calendarRef.current?.getApi();

  // ── Carga de catálogos ─────────────────────────────────────
  useEffect(() => {
    getDentists()
      .then(setDentists)
      .catch(() => setDentists([]));
  }, []);

  // ── Carga de citas del rango visible ───────────────────────
  // Solo se pide lo que se ve (from/to), no todo el historial.
  // El calendario NO se desmonta mientras carga: conserva la fecha
  // y la vista; solo aparece una barra fina de progreso.
  //
  // `cargando` se deriva: hay carga en curso mientras el último
  // resultado recibido no corresponde al rango pedido.
  const [recarga, setRecarga] = useState(0);
  const recargar = useCallback(() => setRecarga((n) => n + 1), []);
  const [resultado, setResultado] = useState({ clave: null, citas: [] });
  const clave = rango ? `${rango.from}|${rango.to}|${recarga}` : null;
  const citas = resultado.citas;
  const cargando = clave !== null && resultado.clave !== clave;

  useEffect(() => {
    if (!rango) return undefined;
    const ctrl = new AbortController();
    const pedida = `${rango.from}|${rango.to}|${recarga}`;
    getAppointments(rango, { signal: ctrl.signal })
      .then((data) => setResultado({ clave: pedida, citas: data }))
      .catch((err) => {
        if (err?.name !== 'CanceledError') setResultado({ clave: pedida, citas: [] });
      });
    return () => ctrl.abort();
  }, [rango, recarga]);

  // FullCalendar avisa cada vez que cambia el rango o la vista
  const handleDatesSet = useCallback((info) => {
    const from = aHoraLocal(info.start);
    const to = aHoraLocal(info.end);
    setRango((r) => (r && r.from === from && r.to === to ? r : { from, to }));
    setVista(info.view.type);
    setTitulo(tituloDe(info.view.type, info.view.currentStart, info.view.currentEnd));
    setFechaVisible(aHoraLocal(info.view.currentStart).slice(0, 10));
  }, []);

  // ── Filtro por odontólogo (en el navegador) ────────────────
  const citasFiltradas = useMemo(
    () => (seleccion.length ? citas.filter((c) => seleccion.includes(c.staff_id)) : citas),
    [citas, seleccion],
  );
  const events = useMemo(() => citasFiltradas.map(toCalendarEvent), [citasFiltradas]);

  // Citas por odontólogo en el rango visible (sin contar canceladas)
  const conteos = useMemo(() => {
    const c = {};
    citas.forEach((x) => {
      if (x.status_name !== 'cancelled') c[x.staff_id] = (c[x.staff_id] || 0) + 1;
    });
    return c;
  }, [citas]);
  const totalActivas = useMemo(() => citas.filter((x) => x.status_name !== 'cancelled').length, [citas]);

  // Días con citas (para los puntos de la tira semanal en móvil)
  const diasConCitas = useMemo(
    () => new Set(citasFiltradas.map((c) => c.scheduled_at.slice(0, 10))),
    [citasFiltradas],
  );

  // Iniciales del odontólogo en cada cita solo cuando se ven varios:
  // con uno solo filtrado, sería información repetida
  const mostrarOdontologo = seleccion.length !== 1 && dentists.length > 1;
  const odontologoDe = useCallback((staffId) => {
    const d = dentists.find((x) => String(x.id) === String(staffId));
    return d ? { iniciales: inicialesOdontologo(d), color: colorOdontologo(dentists, staffId) } : null;
  }, [dentists]);

  // ── Handlers del calendario ────────────────────────────────

  const abrirNuevaCita = useCallback((inicial) => {
    setNuevaCita((n) => ({ open: true, key: n.key + 1, inicial }));
  }, []);

  // Abre el diálogo con el día y la hora del hueco indicado (en la
  // vista de mes, solo el día) y el odontólogo del filtro, si hay
  // exactamente uno elegido.
  const openDialog = useCallback((date, allDay) => {
    const local = aHoraLocal(date);
    abrirNuevaCita({
      fecha: local.slice(0, 10),
      hora: allDay ? null : local.slice(11, 16),
      staffId: seleccion.length === 1 ? seleccion[0] : null,
    });
  }, [abrirNuevaCita, seleccion]);

  // Botón "Nueva cita": sin hora; la fecha es la visible si es hoy o futura
  const handleNueva = useCallback(() => {
    const hoy = hoyLocal();
    abrirNuevaCita({
      fecha: vista === 'timeGridDay' && fechaVisible > hoy ? fechaVisible : hoy,
      hora: null,
      staffId: seleccion.length === 1 ? seleccion[0] : null,
    });
  }, [abrirNuevaCita, vista, fechaVisible, seleccion]);

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

  // Clic en una cita existente: abre el diálogo de detalle con el
  // formulario de cambio de estado limpio
  const handleEventClick = useCallback((info) => {
    setStatusError('');
    setShowCancelForm(false);
    setCancelReason('');
    setStatusChanging(false);
    setSelectedEvent(info.event);
    setDetailOpen(true);
  }, []);

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
      recargar();
    } catch (err) {
      // Un 403 ya lo muestra ForbiddenNotice con el mensaje del servidor
      if (!isForbidden(err)) {
        setStatusError(
          err.response?.data?.error || 'Error al cambiar el estado. Inténtalo de nuevo.',
        );
      }
    } finally {
      setStatusChanging(false);
    }
  }, [selectedEvent, handleDetailClose, recargar]);

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
    recargar();
  }, [recargar]);


  // Cabecera de cada día en semana: "LUN" y el número; hoy, en un
  // círculo rojo como en Calendario. En mes, solo la inicial del día.
  const renderCabeceraDia = useCallback((arg) => {
    // En la vista de mes FullCalendar entrega un `date` de referencia
    // en UTC (no un día real); `dow` es el dato confiable
    const dia = DIAS_CORTOS[arg.dow ?? arg.date.getDay()];
    if (arg.view.type === 'dayGridMonth') return <span className="dia-semana">{dia}</span>;
    return (
      <span className="dia-cabecera">
        <span className="dia-semana">{dia}</span>
        <span className={`dia-numero${arg.isToday ? ' es-hoy' : ''}`}>{arg.date.getDate()}</span>
      </span>
    );
  }, []);

  const renderEvento = useCallback((arg) => (
    <EventoCita
      arg={arg}
      oscuro={isDark}
      odontologo={mostrarOdontologo ? odontologoDe(arg.event.extendedProps.staff_id) : null}
    />
  ), [isDark, mostrarOdontologo, odontologoDe]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} data-fc-mode={mode}>
      <AgendaToolbar
        titulo={titulo}
        vista={vista}
        oscuro={isDark}
        isMobile={isMobile}
        onVista={(v) => api()?.changeView(v)}
        onAnterior={() => api()?.prev()}
        onSiguiente={() => api()?.next()}
        onHoy={() => api()?.today()}
        onNueva={handleNueva}
      />

      {/* Filtro de odontólogos + leyenda de estados */}
      <Box
        sx={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: 1.5, mb: 2,
        }}
      >
        <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
          <FiltroOdontologos
            dentists={dentists}
            seleccion={seleccion}
            onCambiar={setSeleccion}
            conteos={conteos}
            total={totalActivas}
            oscuro={isDark}
          />
        </Box>
        {!isMobile && (
          <Box component="ul" aria-label="Estados de la cita" sx={{ display: 'flex', gap: 1.75, m: 0, p: 0, listStyle: 'none' }}>
            {ESTADOS_LEYENDA.map((st) => (
              <Box component="li" key={st} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, color: 'text.secondary' }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[st] }} />
                {STATUS_LABELS[st]}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Tira de la semana: solo móvil y vista de día */}
      {isMobile && vista === 'timeGridDay' && (
        <SemanaMovil
          fecha={fechaVisible}
          onElegir={(f) => api()?.gotoDate(parseFechaLocal(f))}
          diasConCitas={diasConCitas}
          oscuro={isDark}
        />
      )}

      <Paper elevation={0} sx={surfaceSx}>
        {/* Carga sin desmontar el calendario: una línea fina arriba */}
        {cargando && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 5 }} />
        )}

        <Box sx={{ height: isMobile ? 'auto' : 'calc(100vh - 252px)', minHeight: isMobile ? 0 : 560 }}>
          <FullCalendar
            // La key fuerza un remontaje al cruzar el breakpoint móvil/escritorio
            // (por ejemplo al rotar o redimensionar), para que initialView tome efecto
            key={isMobile ? 'cal-mobile' : 'cal-desktop'}
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            // Explícito: las citas llegan como hora de pared sin zona y
            // se pintan tal cual en la hora local del navegador.
            timeZone="local"
            locale="es"
            firstDay={1}
            initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
            headerToolbar={false}
            datesSet={handleDatesSet}
            // Solo días y horas de atención de la clínica
            hiddenDays={DIAS_CERRADOS}
            slotMinTime={`${CLINICA.horario.apertura}:00`}
            slotMaxTime={`${CLINICA.horario.cierre}:00`}
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: false }}
            allDaySlot={false}
            nowIndicator
            // Citas simultáneas lado a lado, sin encimarse
            slotEventOverlap={false}
            eventMinHeight={22}
            // En vista de día el título ya dice qué día es
            dayHeaders={vista !== 'timeGridDay'}
            dayHeaderContent={renderCabeceraDia}
            eventContent={renderEvento}
            dayMaxEvents={3}
            moreLinkText={(n) => `${n} más`}
            events={events}
            height={isMobile ? 'auto' : '100%'}
            expandRows
            selectable
            selectMirror
            dateClick={handleDateClick}
            select={handleSelect}
            eventClick={handleEventClick}
          />
        </Box>
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

                  {/* Sin permiso para gestionarla: solo lectura */}
                  {ep.soloLectura ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Solo lectura: esta cita la gestiona {ep.staffName || 'otro odontólogo'}.
                    </Typography>
                  ) : ['completed', 'cancelled', 'no_show'].includes(ep.status_name) ? (
                    // Estados finales: no hay acciones posibles
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
              {/* Botón "Reprogramar" — visible solo para citas canceladas o no asistidas
                  que el usuario puede gestionar */}
              {!ep.soloLectura && ['cancelled', 'no_show'].includes(ep.status_name) && (
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
