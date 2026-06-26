// src/pages/AgendaPage.jsx
// ============================================================
// Pantalla de Agenda. Muestra las citas en un calendario
// semanal/diario/mensual usando FullCalendar.
// Se renderiza dentro del Layout (sin barra lateral propia).
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, FormControl,
  InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAppointments } from '../api/appointments';
import { getDentists } from '../api/staff';

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

// ── Componente principal ──────────────────────────────────────
export default function AgendaPage() {
  const [events, setEvents] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');   // '' = Todos
  const [loading, setLoading] = useState(true);

  // Cargar lista de odontólogos (solo al montar)
  useEffect(() => {
    getDentists()
      .then(setDentists)
      .catch(() => setDentists([]));
  }, []);

  // Cargar citas cuando cambia el filtro de odontólogo
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
          />
        )}
      </Paper>
    </Box>
  );
}
