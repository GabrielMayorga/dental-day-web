// src/components/cita/SelectorHorario.jsx
// ============================================================
// Columna de fecha y hora del diálogo de nueva cita: días,
// odontólogo, tratamiento y la cuadrícula de horarios con su
// disponibilidad real. No calcula nada: recibe `horarios` ya
// resueltos por src/utils/disponibilidad.js.
// ============================================================
import { useState, forwardRef } from 'react';
import {
  Box, Typography, Chip, Avatar, IconButton, Tooltip, Popover,
  FormControl, InputLabel, Select, MenuItem, Button, Skeleton, Alert,
} from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { CalendarMonth, ArrowForward } from '@mui/icons-material';
import { LocalizationProvider, DateCalendar } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { esES } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { sumarDias } from '../../utils/fechas';
import { horaCorta, esDiaHabil } from '../../utils/disponibilidad';
import { CLINICA } from '../../config/clinica';
import { duration, easing, transition } from '../../theme/motion';
import useReducedMotion from '../../hooks/useReducedMotion';
import { iniciales, chipDia, fechaLarga } from './comun';

const DIAS_VISIBLES = 7;   // Hoy, Mañana y los 5 siguientes

const aparecer = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const ETIQUETA_ESTADO = {
  libre: 'libre',
  ocupado: 'ocupado',
  fuera_de_horario: 'termina después del cierre',
};

const tooltipDe = (h) => {
  if (h.estado === 'ocupado') {
    return `Ocupado de ${horaCorta(h.conflicto.inicio)} a ${horaCorta(h.conflicto.fin)}`;
  }
  if (h.estado === 'fuera_de_horario') return 'Termina después del cierre';
  return '';
};

// Título de sección pequeño, en mayúsculas
const Rotulo = ({ children, ...props }) => (
  <Typography
    {...props}
    sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, ...props.sx }}
  >
    {children}
  </Typography>
);

// Muestra de color de la leyenda: imita el borde de cada tipo de botón
const Muestra = ({ estilo, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: 'text.secondary' }}>
    <Box sx={{ width: 14, height: 14, borderRadius: '4px', ...estilo }} />
    {children}
  </Box>
);

const SelectorHorario = forwardRef(function SelectorHorario({
  hoy, fecha, onFecha,
  dentists, staffId, onStaff,
  treatments, treatmentId, onTreatment,
  horarios, hora, onHora,
  cargando, errorCarga, onReintentar,
  aviso, grillaClave,
}, encabezadoRef) {
  const reduced = useReducedMotion();
  const [anclaCalendario, setAnclaCalendario] = useState(null);

  const dias = Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDias(hoy, i));
  const fechaFueraDeLista = !dias.includes(fecha);

  // Siguiente día de atención después de la fecha elegida
  const siguienteDiaHabil = () => {
    let f = sumarDias(fecha, 1);
    while (!esDiaHabil(f, CLINICA.horario)) f = sumarDias(f, 1);
    return f;
  };

  const etiquetaDia = (f, i) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : chipDia(f));

  // ── Cuadrícula ──────────────────────────────────────────────
  const visibles = horarios.filter((h) => h.estado !== 'pasado');
  const grupos = [
    { titulo: 'Mañana', items: visibles.filter((h) => h.hora < '12:00') },
    { titulo: 'Tarde',  items: visibles.filter((h) => h.hora >= '12:00') },
  ].filter((g) => g.items.length);
  const hayLibres = visibles.some((h) => h.estado === 'libre');
  const diaHabil = esDiaHabil(fecha, CLINICA.horario);

  const botonHorario = (h) => {
    const elegido = h.hora === hora;
    const libre = h.estado === 'libre';
    const boton = (
      <Button
        key={h.hora}
        size="small"
        variant={elegido ? 'contained' : 'outlined'}
        disabled={!libre}
        aria-pressed={elegido}
        aria-label={`${horaCorta(h.hora)}, ${elegido ? 'elegido' : ETIQUETA_ESTADO[h.estado]}`}
        onClick={() => onHora(elegido ? null : h.hora)}
        sx={{
          width: '100%',
          minWidth: 0,
          borderRadius: '14px',
          fontVariantNumeric: 'tabular-nums',
          transition: `${transition('background-color')}, ${transition('border-color')}, ${transition('color')}`,
          ...(h.estado === 'ocupado' && {
            '&.Mui-disabled': { textDecoration: 'line-through', bgcolor: 'action.disabledBackground' },
          }),
          ...(h.estado === 'fuera_de_horario' && {
            '&.Mui-disabled': { borderStyle: 'dashed' },
          }),
        }}
      >
        {horaCorta(h.hora)}
      </Button>
    );
    if (libre) return boton;
    // Un botón deshabilitado no recibe eventos: el tooltip va en un span
    return (
      <Tooltip key={h.hora} title={tooltipDe(h)} arrow>
        <Box component="span" sx={{ display: 'block' }}>{boton}</Box>
      </Tooltip>
    );
  };

  let cuadricula;
  if (!staffId) {
    cuadricula = (
      <Typography sx={{ fontSize: 14, color: 'text.secondary', py: 2 }}>
        Elige un odontólogo para ver sus horarios libres.
      </Typography>
    );
  } else if (cargando) {
    cuadricula = (
      <Box aria-busy="true" aria-label="Cargando horarios" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 1 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={31} sx={{ borderRadius: '14px' }} />
        ))}
      </Box>
    );
  } else if (errorCarga) {
    cuadricula = (
      <Alert
        severity="error"
        sx={{ borderRadius: '14px' }}
        action={<Button color="inherit" size="small" onClick={onReintentar}>Reintentar</Button>}
      >
        {errorCarga}
      </Alert>
    );
  } else {
    cuadricula = (
      <Box
        key={grillaClave}
        sx={{ animation: reduced ? 'none' : `${aparecer} ${duration.fast}ms ${easing.enter}` }}
      >
        {!hayLibres && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: grupos.length ? 2 : 0, py: 1 }}>
            <Typography sx={{ fontSize: 14, color: 'text.primary', fontWeight: 500 }}>
              {diaHabil ? 'No quedan horarios este día' : 'La clínica no atiende este día'}
            </Typography>
            <Button size="small" endIcon={<ArrowForward />} onClick={() => onFecha(siguienteDiaHabil())}>
              Ver el día siguiente
            </Button>
          </Box>
        )}
        {grupos.map((g) => (
          <Box key={g.titulo} role="group" aria-label={`Horarios de la ${g.titulo.toLowerCase()}`} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
              {g.titulo}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 1 }}>
              {g.items.map(botonHorario)}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        ref={encabezadoRef}
        tabIndex={-1}
        component="h3"
        sx={{ fontWeight: 600, color: 'text.primary', mb: 2, outline: 'none' }}
      >
        Fecha y hora
      </Typography>

      {/* ── Días ─────────────────────────────────────────────── */}
      <Rotulo id="rotulo-dia">Día</Rotulo>
      <Box role="group" aria-labelledby="rotulo-dia" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5, alignItems: 'center' }}>
        {dias.map((f, i) => {
          const habil = esDiaHabil(f, CLINICA.horario);
          return (
            <Chip
              key={f}
              label={etiquetaDia(f, i)}
              clickable={habil}
              disabled={!habil}
              color={f === fecha ? 'primary' : 'default'}
              variant={f === fecha ? 'filled' : 'outlined'}
              aria-pressed={f === fecha}
              aria-label={`${fechaLarga(f)}${habil ? '' : ', la clínica no atiende'}`}
              onClick={habil ? () => onFecha(f) : undefined}
              sx={{ borderRadius: '14px', fontWeight: 500 }}
            />
          );
        })}
        {fechaFueraDeLista && (
          <Chip
            label={chipDia(fecha)}
            color="primary"
            aria-pressed
            aria-label={fechaLarga(fecha)}
            sx={{ borderRadius: '14px', fontWeight: 500 }}
          />
        )}
        <Tooltip title="Elegir otra fecha">
          <IconButton
            size="small"
            aria-label="Elegir otra fecha en el calendario"
            onClick={(e) => setAnclaCalendario(e.currentTarget)}
          >
            <CalendarMonth fontSize="small" />
          </IconButton>
        </Tooltip>
        <Popover
          open={Boolean(anclaCalendario)}
          anchorEl={anclaCalendario}
          onClose={() => setAnclaCalendario(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
        >
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale="es"
            localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}
          >
            <DateCalendar
              value={dayjs(fecha)}
              minDate={dayjs(hoy)}
              shouldDisableDate={(d) => !CLINICA.horario.dias.includes(d.day())}
              onChange={(d) => {
                if (!d) return;
                onFecha(d.format('YYYY-MM-DD'));
                setAnclaCalendario(null);
              }}
            />
          </LocalizationProvider>
        </Popover>
      </Box>

      {/* ── Odontólogo ───────────────────────────────────────── */}
      <Rotulo id="rotulo-odontologo">Odontólogo</Rotulo>
      <Box role="group" aria-labelledby="rotulo-odontologo" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
        {dentists.length === 0 && (
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>No hay odontólogos activos.</Typography>
        )}
        {dentists.map((d) => {
          const elegido = String(d.id) === String(staffId);
          return (
            <Chip
              key={d.id}
              avatar={<Avatar>{iniciales(d.first_name, d.last_name)}</Avatar>}
              label={`${d.first_name} ${d.last_name}`}
              clickable
              color={elegido ? 'primary' : 'default'}
              variant={elegido ? 'filled' : 'outlined'}
              aria-pressed={elegido}
              onClick={() => onStaff(d.id)}
              sx={{ borderRadius: '14px', fontWeight: 500 }}
            />
          );
        })}
      </Box>

      {/* ── Tratamiento ──────────────────────────────────────── */}
      <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
        <InputLabel id="tratamiento-label">Tratamiento</InputLabel>
        <Select
          labelId="tratamiento-label"
          label="Tratamiento"
          value={treatmentId}
          onChange={(e) => onTreatment(e.target.value)}
          renderValue={(id) => {
            const t = treatments.find((x) => String(x.id) === String(id));
            return t ? `${t.name} · ${t.duration_minutes} min` : '';
          }}
        >
          {treatments.map((t) => (
            <MenuItem key={t.id} value={t.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <span>{t.name}</span>
              <Box component="span" sx={{ color: 'text.secondary', fontSize: 13 }}>{t.duration_minutes} min</Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* ── Horarios ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Rotulo sx={{ mb: 0 }}>Horario</Rotulo>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }} aria-hidden="true">
          <Muestra estilo={{ border: 1, borderColor: 'primary.main' }}>Libre</Muestra>
          <Muestra estilo={{ bgcolor: 'action.disabledBackground', border: 1, borderColor: 'action.disabled' }}>Ocupado</Muestra>
          <Muestra estilo={{ border: '1px dashed', borderColor: 'action.disabled' }}>Pasa del cierre</Muestra>
        </Box>
      </Box>
      {!treatmentId && staffId && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
          Sin tratamiento elegido se muestran bloques de {CLINICA.horario.intervaloMinutos} min.
        </Typography>
      )}
      {aviso && (
        <Alert severity="warning" sx={{ borderRadius: '14px', mb: 1.5 }} role="status">
          {aviso}
        </Alert>
      )}
      {cuadricula}
    </Box>
  );
});

export default SelectorHorario;
