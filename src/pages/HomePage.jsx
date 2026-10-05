// src/pages/HomePage.jsx
// ============================================================
// Página de inicio: muestra el trabajo del día (citas de hoy con
// acciones rápidas), lo que viene en los próximos días, los datos
// de la clínica y, para admin y odontólogo, los indicadores.
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Button, CircularProgress, Alert,
  Divider, Grow, Link, Skeleton, useTheme, useMediaQuery,
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { EventAvailable, EventBusy, ArrowForward, AccessTime, Phone, Place } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getAppointments, changeAppointmentStatus } from '../api/appointments';
import { getNotifications } from '../api/notifications';
import { getDashboard } from '../api/reports';
import { translateStatus, STATUS_COLORS } from '../utils/appointmentStatus';
import { clinica } from '../config/clinica';
import DentalDayMark from '../components/DentalDayMark';
import { ListRowsSkeleton, KpiSkeleton } from '../components/Skeletons';
import useReducedMotion, { REDUCED_MOTION_QUERY } from '../hooks/useReducedMotion';
import { duration, easing, stagger, transition } from '../theme/motion';

// ── Helpers ──────────────────────────────────────────────────

// Hora LOCAL 'YYYY-MM-DDTHH:mm:ss'. No usar toISOString(): el backend
// guarda hora de pared y la conversión a UTC correría el rango.
const aHoraLocal = (date) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
       + `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
};

const saludo = (hora) => {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

// "sábado, 4 de octubre de 2026" → "Sábado 4 de octubre de 2026"
const fechaLarga = (date) => {
  const texto = date
    .toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(',', '');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const horaCorta = (isoStr) =>
  new Date(isoStr).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', hour12: false });

// El usuario solo trae email; si algún día trae nombre, se usa ese.
const nombreVisible = (user) => {
  if (user?.name) return user.name;
  const local = user?.email?.split('@')[0] ?? '';
  return local.charAt(0).toUpperCase() + local.slice(1);
};

// Única transición "hacia adelante" válida por estado (máquina del backend).
// completed, cancelled y no_show no tienen acción rápida.
const NEXT_ACTION = {
  scheduled:   { status: 'confirmed',   label: 'Confirmar' },
  confirmed:   { status: 'in_progress', label: 'Iniciar' },
  in_progress: { status: 'completed',   label: 'Completar' },
};

const KPI_ROLES = ['admin', 'dentist'];

// Ámbar de la marca: reservado SOLO para el bloque "sin confirmar",
// que es lo único de la pantalla que pide acción al usuario.
const ACENTO_ACCION = '#F5A623';

// Todo lo que sea movimiento se apaga con esta consulta; los cambios
// de color se mantienen porque no marean.
const REDUCED = `@media ${REDUCED_MOTION_QUERY}`;

const pulso = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
`;

// Entrada escalonada con Grow. Usa `appear`, así que solo anima al
// montarse; los re-renders posteriores no la repiten.
const Reveal = ({ index, reduceMotion, children }) => (
  <Grow
    in appear={!reduceMotion} timeout={reduceMotion ? 0 : duration.slow} easing={easing.enter}
    style={{ transitionDelay: `${reduceMotion ? 0 : stagger(index)}ms`, transformOrigin: '50% 0' }}
  >
    <Box>{children}</Box>
  </Grow>
);

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

// Cuenta de 0 al valor final en `duration` ms. Se reinicia cada vez que
// cambia el valor (carga inicial o cambio de período).
const useCountUp = (target, reduceMotion, ms = duration.counter) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduceMotion) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / ms, 1);
      setValue(Math.round(target * easeOutCubic(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion, ms]);
  return reduceMotion ? target : value;
};

const CountUp = ({ value, suffix = '', reduceMotion }) => {
  const n = useCountUp(Number(value) || 0, reduceMotion);
  return <>{n}{suffix}</>;
};

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const reduceMotion = useReducedMotion();

  const showKpis = KPI_ROLES.includes(user?.role);

  // ── Superficies ─────────────────────────────────────────────
  // Jerarquía por peso. En claro: glass con gradiente leve y más sombra
  // en el bloque principal. En oscuro las sombras no se ven, así que la
  // elevación es por luminosidad (palette.surface, niveles 1–3) más un
  // borde superior luminoso; al pasar el mouse la tarjeta sube un nivel.
  const paper = theme.palette.background.paper;
  const surfaces = theme.palette.surface;
  const surfaceSx = (principal) => {
    const base = { borderRadius: '14px', p: { xs: 2, md: 3 }, position: 'relative' };
    if (isDark) {
      const nivel = principal ? 2 : 1;
      return {
        ...base,
        backgroundColor: surfaces[nivel],
        border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
        transition: transition('background-color', 'fast', 'enter'),
        // Si el mouse está sobre una fila de cita, sube la fila, no la tarjeta
        '&:hover:not(:has([data-row]:hover))': { backgroundColor: surfaces[nivel + 1] },
        '&::before': {
          content: '""', position: 'absolute', top: -1, left: 0, right: 0, height: '1px',
          pointerEvents: 'none',
          background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.light, 0.35)}, transparent)`,
        },
      };
    }
    const op = principal ? 0.84 : 0.64;
    return {
      ...base,
      background: `linear-gradient(165deg, ${alpha(paper, Math.min(op + 0.12, 1))} 0%, ${alpha(paper, op)} 100%)`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: principal
        ? `0 12px 32px ${alpha(theme.palette.primary.main, 0.12)}`
        : `0 4px 14px ${alpha(theme.palette.primary.main, 0.05)}`,
    };
  };

  // ── Estado ──────────────────────────────────────────────────
  const [today, setToday]           = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState('');
  const [changingId, setChangingId] = useState(null);
  const [rowError, setRowError]     = useState({ id: null, msg: '' });

  const [upcoming, setUpcoming]     = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState('');

  const [totals, setTotals]         = useState(null);
  const [kpiError, setKpiError]     = useState('');

  const now = new Date();

  // ── Carga inicial ───────────────────────────────────────────
  useEffect(() => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);

    getAppointments({ from: aHoraLocal(inicio), to: aHoraLocal(fin) })
      .then((citas) => setToday(
        [...citas].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
      ))
      .catch(() => setTodayError('No se pudieron cargar las citas de hoy.'))
      .finally(() => setTodayLoading(false));

    getNotifications()
      .then((data) => setUpcoming(data?.items ?? []))
      .catch(() => setUpcomingError('No se pudieron cargar las próximas citas.'))
      .finally(() => setUpcomingLoading(false));
  }, []);

  // /reports/dashboard responde 403 a recepcionista: ni siquiera se pide.
  useEffect(() => {
    if (!showKpis) return;
    getDashboard()
      .then((data) => setTotals(data?.totals ?? null))
      .catch(() => setKpiError('No se pudieron cargar los indicadores.'));
  }, [showKpis]);

  // ── Acción rápida: avanza el estado de una sola cita ────────
  const handleAdvance = async (cita) => {
    const next = NEXT_ACTION[cita.status_name];
    if (!next) return;
    setChangingId(cita.id);
    setRowError({ id: null, msg: '' });
    try {
      await changeAppointmentStatus(cita.id, next.status);
      const patch = { status_name: next.status, status_color: STATUS_COLORS[next.status] ?? cita.status_color };
      setToday((prev) => prev.map((c) => (c.id === cita.id ? { ...c, ...patch } : c)));
      // Mantiene coherente el conteo de "sin confirmar" si la cita estaba ahí
      setUpcoming((prev) => prev.map((c) => (c.id === cita.id ? { ...c, ...patch } : c)));
    } catch (err) {
      setRowError({ id: cita.id, msg: err.response?.data?.message || 'No se pudo cambiar el estado.' });
    } finally {
      setChangingId(null);
    }
  };

  const tomorrowCount    = upcoming.filter((c) => c.group === 'mañana').length;
  const weekCount        = upcoming.filter((c) => c.group === 'semana').length;
  const unconfirmedCount = upcoming.filter((c) => c.status_name === 'scheduled').length;

  // ── Fila de cita ────────────────────────────────────────────
  // El borde y el punto transicionan 400ms al color del nuevo estado.
  const rowSx = (cita) => ({
    display: 'flex', alignItems: 'center', gap: 1.5,
    py: 1.25, px: 1.5,
    borderLeft: `3px solid ${cita.status_color}`,
    borderRadius: '10px',
    backgroundColor: isDark ? 'transparent' : alpha(paper, 0.55),
    transition: [
      transition('transform', 'fast', 'enter'),
      transition('background-color', 'fast', 'enter'),
      transition('box-shadow', 'fast', 'enter'),
      transition('border-color', 'slow'),
    ].join(', '),
    '&:hover': {
      transform: 'translateY(-2px)',
      backgroundColor: isDark ? surfaces[3] : paper,
      boxShadow: isDark ? 'none' : `0 6px 16px ${alpha(theme.palette.primary.main, 0.10)}`,
    },
    [REDUCED]: {
      transition: `${transition('background-color', 'fast', 'enter')}, ${transition('border-color', 'slow')}`,
      '&:hover': { transform: 'none' },
    },
  });

  const dotSx = (cita) => ({
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
    backgroundColor: cita.status_color,
    transition: transition('background-color', 'slow'),
    // La cita en curso late en el punto, nunca en la fila
    ...(cita.status_name === 'in_progress' && {
      animation: `${pulso} 2s ease-in-out infinite`,
      [REDUCED]: { animation: 'none' },
    }),
  });

  // ── Bloques ─────────────────────────────────────────────────
  const todayBlock = (
    <Paper elevation={0} sx={surfaceSx(true)}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5 }}>
        Hoy
        {!todayLoading && !todayError && (
          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {` · ${today.length} ${today.length === 1 ? 'cita' : 'citas'}`}
          </Box>
        )}
      </Typography>

      {todayLoading && <ListRowsSkeleton rows={4} />}

      {!todayLoading && todayError && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{todayError}</Alert>
      )}

      {!todayLoading && !todayError && today.length === 0 && (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
          <EventBusy sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No hay citas programadas para hoy
          </Typography>
          <Button variant="outlined" size="small" onClick={() => navigate('/agenda')} sx={{ borderRadius: '8px' }}>
            Ir a la agenda
          </Button>
        </Box>
      )}

      {!todayLoading && !todayError && today.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {today.map((cita) => {
            const next = NEXT_ACTION[cita.status_name];
            const busy = changingId === cita.id;
            return (
              <Box key={cita.id}>
                <Box data-row sx={rowSx(cita)}>
                  <Box sx={dotSx(cita)} />
                  <Typography sx={{ fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums', minWidth: 44 }}>
                    {horaCorta(cita.scheduled_at)}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {cita.patient_name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {cita.reason ? `${cita.reason} · ` : ''}{translateStatus(cita.status_name)}
                    </Typography>
                  </Box>
                  {next && (
                    <Button
                      size="small" variant="outlined" disabled={changingId !== null}
                      onClick={() => handleAdvance(cita)}
                      sx={{ borderRadius: '8px', flexShrink: 0, minWidth: 96 }}
                    >
                      {busy ? <CircularProgress size={14} thickness={5} /> : next.label}
                    </Button>
                  )}
                </Box>
                {rowError.id === cita.id && (
                  <Alert severity="error" sx={{ borderRadius: '12px', mt: 0.5, py: 0 }}>{rowError.msg}</Alert>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );

  const upcomingBlock = (
    <Paper elevation={0} sx={surfaceSx(false)}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
        Próximas
      </Typography>
      {upcomingLoading && [0, 1].map((i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25 }}>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="text" width={24} sx={{ fontSize: 22 }} />
        </Box>
      ))}
      {!upcomingLoading && upcomingError && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{upcomingError}</Alert>
      )}
      {!upcomingLoading && !upcomingError && (
        [['Mañana', tomorrowCount], ['Resto de la semana', weekCount]].map(([label, count], i) => (
          <Box key={label}>
            {i > 0 && <Divider sx={{ borderColor: 'divider' }} />}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 1.25 }}>
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{label}</Typography>
              <Typography variant="h5" component="span" sx={{ color: 'text.primary' }}>{count}</Typography>
            </Box>
          </Box>
        ))
      )}
    </Paper>
  );

  const unconfirmedBlock = (
    <Paper elevation={0} sx={{
      ...surfaceSx(false),
      borderLeft: `3px solid ${ACENTO_ACCION}`,
      // Único resplandor de la pantalla
      boxShadow: isDark
        ? `0 0 20px ${alpha(ACENTO_ACCION, 0.15)}`
        : `0 4px 14px ${alpha(theme.palette.primary.main, 0.05)}, 0 0 20px ${alpha(ACENTO_ACCION, 0.15)}`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <EventAvailable sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>Sin confirmar</Typography>
      </Box>
      <Typography variant="h3" component="p" sx={{ fontWeight: 700, color: ACENTO_ACCION, lineHeight: 1.1 }}>
        {unconfirmedCount}
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
        {unconfirmedCount === 1 ? 'cita programada' : 'citas programadas'} en los próximos 7 días
      </Typography>
      <Button
        size="small" endIcon={<ArrowForward />} onClick={() => navigate('/agenda')}
        sx={{ borderRadius: '8px', px: 0 }}
      >
        Revisar
      </Button>
    </Paper>
  );

  const infoRow = (Icon, content) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
      <Icon sx={{ fontSize: 18, color: 'text.secondary', mt: '2px' }} />
      <Box sx={{ fontSize: 14, color: 'text.primary', minWidth: 0 }}>{content}</Box>
    </Box>
  );

  const clinicBlock = (
    <Paper elevation={0} sx={surfaceSx(false)}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        {/* Acento del isotipo en el color del texto: el ámbar queda
            reservado para el bloque "sin confirmar". */}
        <Box sx={{ color: 'text.primary', display: 'flex' }}>
          <DentalDayMark size={48} accent="currentColor" />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{clinica.nombre}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{clinica.lema}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {infoRow(AccessTime, clinica.horario.map((h) => (
          <Box key={h.dias}>
            {h.dias}: <Box component="span" sx={{ color: 'text.secondary' }}>{h.horas}</Box>
          </Box>
        )))}
        {infoRow(Phone, (
          <Link href={`tel:${clinica.telefono.replace(/[^\d+]/g, '')}`} underline="hover" sx={{ color: 'inherit' }}>
            {clinica.telefono}
          </Link>
        ))}
        {infoRow(Place, clinica.direccion)}
      </Box>
    </Paper>
  );

  const kpis = totals && [
    { label: 'Citas totales',        value: totals.appointments },
    { label: 'Tasa de inasistencia', value: totals.absenceRate, suffix: '%' },
    { label: 'Pacientes activos',    value: totals.activePatients },
  ];

  // Índices de la entrada escalonada (orden visual)
  let order = 0;
  const reveal = (node) => <Reveal index={order++} reduceMotion={reduceMotion}>{node}</Reveal>;
  const gap = isMobile ? 2 : 3;

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
          {saludo(now.getHours())}, {nombreVisible(user)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: { xs: 13, sm: 14 } }}>
          {fechaLarga(now)}
        </Typography>
      </Box>

      {/* En móvil se apila; el orden del JSX ya deja "Hoy" primero */}
      <Grid container spacing={gap}>
        <Grid size={{ xs: 12, md: 8 }}>{reveal(todayBlock)}</Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap }}>
            {reveal(upcomingBlock)}
            {!upcomingLoading && !upcomingError && reveal(unconfirmedBlock)}
            {reveal(clinicBlock)}
          </Box>
        </Grid>
      </Grid>

      {/* KPIs: solo admin y odontólogo */}
      {showKpis && (
        <Box sx={{ mt: gap }}>
          {kpiError && <Alert severity="error" sx={{ borderRadius: '12px' }}>{kpiError}</Alert>}
          {!kpis && !kpiError && (
            <Grid container spacing={gap}>
              {[0, 1, 2].map((i) => (
                <Grid size={{ xs: 12, sm: 4 }} key={i}>
                  <KpiSkeleton paperSx={surfaceSx(false)} />
                </Grid>
              ))}
            </Grid>
          )}
          {kpis && (
            <Grid container spacing={gap}>
              {kpis.map((kpi, i) => (
                <Grid size={{ xs: 12, sm: 4 }} key={kpi.label}>
                  <Reveal index={4 + i} reduceMotion={reduceMotion}>
                    <Paper elevation={0} sx={surfaceSx(false)}>
                      <Typography variant="h4" component="p" sx={{ color: 'text.primary', lineHeight: 1.1 }}>
                        <CountUp value={kpi.value} suffix={kpi.suffix} reduceMotion={reduceMotion} />
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.75 }}>{kpi.label}</Typography>
                    </Paper>
                  </Reveal>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default HomePage;
