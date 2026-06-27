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
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAppointments, createAppointment } from '../api/appointments';
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
    background: isDark ? 'rgba(20, 28, 46, 0.70)' : 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(28, 100, 173, 0.10)',
    borderRadius: 3,
    p: { xs: 2, md: 3 },
  };

  const dialogPaperSx = {
    background: isDark ? 'rgba(20, 28, 46, 0.92)' : 'rgba(240, 247, 255, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(28, 100, 173, 0.12)',
    borderRadius: '16px',
    minWidth: { xs: '90vw', sm: '480px' },
  };

  // ── Estado del calendario ──────────────────────────────────
  const [events, setEvents] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');   // '' = Todos
  const [loading, setLoading] = useState(true);

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
          />
        )}
      </Paper>

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
