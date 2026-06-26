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
  Button, TextField, Alert, Stack,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAppointments, createAppointment } from '../api/appointments';
import { getDentists } from '../api/staff';
import { getPatients } from '../api/patients';
import { getTreatments } from '../api/treatments';

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
  title: `${cita.patient_name} — ${cita.reason || cita.status_name}`,
  start: cita.scheduled_at,
  end: addMinutes(cita.scheduled_at, cita.duration_minutes),
  backgroundColor: cita.status_color,
  borderColor: cita.status_color,
  textColor: '#ffffff',
  extendedProps: {
    staffName: cita.staff_name,
    statusName: cita.status_name,
  },
});

// Convierte el dateStr de FullCalendar al formato del input datetime-local
// Ejemplo: "2026-06-25T11:00:00" → "2026-06-25T11:00"
const toDateTimeLocal = (isoStr) => (isoStr ? isoStr.substring(0, 16) : '');

// Convierte el valor del input datetime-local al ISO que espera el backend
// Ejemplo: "2026-06-25T11:00" → "2026-06-25T11:00:00"
const toScheduledAt = (dtLocal) => (dtLocal ? `${dtLocal}:00` : '');

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

// ── Estilos glass para el contenedor del calendario ──────────
const glassPaperSx = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(28, 100, 173, 0.10)',
  borderRadius: 3,
  p: { xs: 2, md: 3 },
  // Sobreescribe los estilos internos de FullCalendar para que encajen
  '& .fc .fc-toolbar-title': {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#0C2A4A',
  },
  '& .fc .fc-button': {
    background: '#1C64AD',
    borderColor: '#1C64AD',
    borderRadius: '8px',
    fontSize: '0.8rem',
    padding: '4px 12px',
    fontFamily: 'inherit',
    textTransform: 'none',
    '&:hover': { background: '#0C447C', borderColor: '#0C447C' },
    '&:focus': { boxShadow: 'none' },
  },
  '& .fc .fc-button-primary:disabled': {
    background: '#2B7FD4',
    borderColor: '#2B7FD4',
  },
  '& .fc .fc-button-active': {
    background: '#0C447C !important',
    borderColor: '#0C447C !important',
  },
  '& .fc-event': {
    borderRadius: '6px',
    fontSize: '0.78rem',
    padding: '1px 3px',
  },
  '& .fc-timegrid-slot': {
    height: '48px',
  },
  '& .fc-col-header-cell': {
    color: '#42648A',
    fontWeight: 600,
    fontSize: '0.82rem',
  },
  '& .fc-timegrid-axis': {
    color: '#42648A',
    fontSize: '0.78rem',
  },
};

// ── Estilos glass para el diálogo ────────────────────────────
const dialogPaperSx = {
  background: 'rgba(240, 247, 255, 0.94)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(28, 100, 173, 0.12)',
  borderRadius: '16px',
  minWidth: { xs: '90vw', sm: '480px' },
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
  // ── Estado del calendario ──────────────────────────────────
  const [events, setEvents] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');   // '' = Todos
  const [loading, setLoading] = useState(true);

  // ── Estado del diálogo de nueva cita ──────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [form, setForm] = useState(FORM_EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Evita recargar pacientes y tratamientos si ya se cargaron
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

  // Pacientes y tratamientos: se cargan la primera vez que se abre el diálogo
  const loadCatalogs = useCallback(async () => {
    if (catalogsLoaded.current) return;
    catalogsLoaded.current = true;
    try {
      const [pats, treats] = await Promise.all([getPatients(), getTreatments()]);
      setPatients(pats);
      setTreatments(treats);
    } catch {
      // Los selects quedarán vacíos; el usuario puede cerrar y reintentar
    }
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Encabezado */}
      <Typography variant="h5" sx={{ color: '#0C2A4A', mb: 3 }}>
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
            <CircularProgress sx={{ color: '#1C64AD' }} />
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
            // Localización en español
            {...calendarLocaleES}
            // Rango horario visible
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            // Citas transformadas
            events={events}
            // Altura del calendario
            height="auto"
            // Muestra fines de semana
            weekends
            // Habilita clic y arrastre para crear citas
            selectable
            selectMirror
            dateClick={handleDateClick}
            select={handleSelect}
          />
        )}
      </Paper>

      {/* ── Diálogo: formulario de nueva cita ────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ color: '#0C2A4A', fontWeight: 600, pb: 1 }}>
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

            {/* Paciente */}
            <FormControl fullWidth size="small">
              <InputLabel>Paciente *</InputLabel>
              <Select
                label="Paciente *"
                value={form.patient_id}
                onChange={handleFormChange('patient_id')}
              >
                {patients.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
            sx={{ color: '#42648A' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            sx={{
              background: '#1C64AD',
              borderRadius: '8px',
              '&:hover': { background: '#0C447C' },
            }}
          >
            {saving ? 'Guardando…' : 'Guardar cita'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
