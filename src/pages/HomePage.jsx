// src/pages/HomePage.jsx
// ============================================================
// Página de inicio: muestra el trabajo del día (citas de hoy con
// acciones rápidas), las citas pendientes del resto de la semana,
// lo que viene en los próximos días, los datos de la clínica y,
// para admin y odontólogo, los indicadores del mes.
//
// Todos los bloques se refrescan solos (useAutoRefresh) mientras la
// pestaña está a la vista, y a la medianoche local se recarga todo
// para que una pantalla abierta de un día para otro no muestre las
// citas de ayer como si fueran de hoy.
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Button, CircularProgress, Alert,
  Divider, Grow, Link, Skeleton, Chip, IconButton, Tooltip, ButtonBase,
  useTheme, useMediaQuery,
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import {
  EventAvailable, EventBusy, ArrowForward, AccessTime, Phone, Place, Refresh, ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getAppointments, changeAppointmentStatus } from '../api/appointments';
import { getNotifications } from '../api/notifications';
import { getDashboard } from '../api/reports';
import { translateStatus, STATUS_COLORS } from '../utils/appointmentStatus';
import { CLINICA } from '../config/clinica';
import DentalDayMark from '../components/DentalDayMark';
import { ListRowsSkeleton, KpiSkeleton } from '../components/Skeletons';
import useReducedMotion, { REDUCED_MOTION_QUERY } from '../hooks/useReducedMotion';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { duration, easing, stagger, transition } from '../theme/motion';
import { aHoraLocal, hoyLocal, sumarDias, formatFecha, formatHora } from '../utils/fechas';

// ── Helpers ──────────────────────────────────────────────────

const saludo = (hora) => {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// "sábado, 4 de octubre de 2026" → "Sábado 4 de octubre de 2026"
const fechaLarga = (date) =>
  capitalizar(formatFecha(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', ''));

// "2026-10-07" → "Miércoles 7 de octubre"
const tituloDia = (dia) =>
  capitalizar(formatFecha(dia, { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''));

// Hora de pared ISO sin zona: el orden de texto es el cronológico
const porHora = (a, b) => a.scheduled_at.localeCompare(b.scheduled_at);

// Rango [from, to) de `dias` días completos desde `desde` ('YYYY-MM-DD'),
// en hora de pared, como lo espera /appointments.
const rangoDias = (desde, dias) => ({
  from: `${desde}T00:00:00`,
  to:   `${sumarDias(desde, dias)}T00:00:00`,
});

// Mes en curso: del día 1 a las 00:00:00 al día 1 del mes siguiente
const rangoMes = () => {
  const hoy = new Date();
  return {
    from: aHoraLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    to:   aHoraLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)),
  };
};

// Milisegundos hasta las 00:00:05 del día siguiente (hora local).
// Los 5 s de margen evitan disparar justo antes del cambio de fecha.
const msHastaMedianoche = () => {
  const ahora = new Date();
  const siguiente = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 5);
  return siguiente - ahora;
};

const haceTexto = (desde, ahora) => {
  const min = Math.max(0, Math.floor((ahora - desde) / 60000));
  return min < 1 ? 'Actualizado hace menos de 1 min' : `Actualizado hace ${min} min`;
};

// Estados que cuentan como "pendiente" en la lista de la semana
// (los mismos que /notifications usa para "Próximas")
const PENDIENTES = ['scheduled', 'confirmed'];
const DIAS_SEMANA = 6; // de mañana a dentro de 6 días

// ids para desplazarse a la lista de la semana y a cada día
const ID_SEMANA = 'semana-lista';
const idDia = (dia) => `semana-${dia}`;
const porId = (id) => document.getElementById(id);

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

const giro = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
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

  // ── Datos (cada bloque se refresca solo) ────────────────────
  // Los fetchers calculan "hoy" en el momento de pedir, así que el
  // refresco de medianoche ya trae el día nuevo sin más cambios.
  const fetchToday = useCallback(
    (signal) => getAppointments(rangoDias(hoyLocal(), 1), { signal })
      .then((citas) => [...citas].sort(porHora)),
    [],
  );
  const fetchWeek = useCallback(
    (signal) => getAppointments(rangoDias(sumarDias(hoyLocal(), 1), DIAS_SEMANA), { signal })
      .then((citas) => citas.filter((c) => PENDIENTES.includes(c.status_name)).sort(porHora)),
    [],
  );
  const fetchUpcoming = useCallback(
    (signal) => getNotifications({ signal }).then((data) => data?.items ?? []),
    [],
  );
  // /reports/dashboard responde 403 a recepcionista: ni siquiera se pide.
  const fetchKpis = useMemo(
    () => (showKpis
      ? (signal) => getDashboard(rangoMes(), { signal }).then((data) => data?.totals ?? null)
      : null),
    [showKpis],
  );

  const todayQ    = useAutoRefresh(fetchToday);
  const weekQ     = useAutoRefresh(fetchWeek);
  const upcomingQ = useAutoRefresh(fetchUpcoming);
  const kpisQ     = useAutoRefresh(fetchKpis);

  const { refresh: refreshToday }    = todayQ;
  const { refresh: refreshWeek }     = weekQ;
  const { refresh: refreshUpcoming } = upcomingQ;
  const { refresh: refreshKpis }     = kpisQ;
  const refreshAll = useCallback(() => {
    refreshToday();
    refreshWeek();
    refreshUpcoming();
    refreshKpis();
  }, [refreshToday, refreshWeek, refreshUpcoming, refreshKpis]);

  const queries = showKpis ? [todayQ, weekQ, upcomingQ, kpisQ] : [todayQ, weekQ, upcomingQ];
  const refreshing = queries.some((q) => q.refreshing);
  // Falló un refresco pero se conservan los datos anteriores
  const refreshFailed = queries.some((q) => q.error && q.data !== undefined);
  // La frescura de la pantalla es la del bloque más viejo
  const fechasCarga = queries.map((q) => q.lastUpdated).filter(Boolean);
  const lastUpdated = fechasCarga.length ? new Date(Math.min(...fechasCarga)) : null;

  const today    = todayQ.data ?? [];
  const week     = weekQ.data ?? [];
  const upcoming = upcomingQ.data ?? [];
  const totals   = kpisQ.data ?? null;

  // ── Reloj de pantalla ───────────────────────────────────────
  // Cada 30 s actualiza el saludo y el "hace X min". A la medianoche
  // local (00:00:05) además recarga todos los bloques; el temporizador
  // se reprograma cada día.
  const [ahora, setAhora] = useState(() => new Date());
  const [dias, setDias]   = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAhora(new Date());
      refreshAll();
      setDias((n) => n + 1); // vuelve a correr este efecto: programa el siguiente día
    }, msHastaMedianoche());
    return () => clearTimeout(timer);
  }, [dias, refreshAll]);

  // ── Acción rápida: avanza el estado de una sola cita ────────
  const [changingId, setChangingId] = useState(null);
  const [rowError, setRowError]     = useState({ id: null, msg: '' });

  const handleAdvance = async (cita, next) => {
    setChangingId(cita.id);
    setRowError({ id: null, msg: '' });
    try {
      await changeAppointmentStatus(cita.id, next.status);
      // La fila cambia al instante en todos los bloques donde aparezca...
      const patch = { status_name: next.status, status_color: STATUS_COLORS[next.status] ?? cita.status_color };
      const aplicar = (lista) => lista?.map((c) => (c.id === cita.id ? { ...c, ...patch } : c));
      todayQ.mutate(aplicar);
      weekQ.mutate(aplicar);
      upcomingQ.mutate(aplicar);
      // ...y luego se recarga todo para que los contadores cuadren
      refreshAll();
    } catch (err) {
      setRowError({ id: cita.id, msg: err.response?.data?.message || 'No se pudo cambiar el estado.' });
    } finally {
      setChangingId(null);
    }
  };

  const tomorrow         = sumarDias(hoyLocal(), 1);
  const tomorrowCount    = upcoming.filter((c) => c.group === 'mañana').length;
  const weekCount        = upcoming.filter((c) => c.group === 'semana').length;
  const unconfirmedCount = upcoming.filter((c) => c.status_name === 'scheduled').length;

  // ── Lista de la semana: filtro y agrupación por día ─────────
  const [soloSinConfirmar, setSoloSinConfirmar] = useState(false);

  const visibles = soloSinConfirmar ? week.filter((c) => c.status_name === 'scheduled') : week;
  // Días de mañana a +6; se omiten los que no tienen citas
  const diasSemana = Array.from({ length: DIAS_SEMANA }, (_, i) => sumarDias(tomorrow, i))
    .map((dia) => ({ dia, citas: visibles.filter((c) => c.scheduled_at.startsWith(dia)) }))
    .filter(({ citas }) => citas.length > 0);

  const desplazarA = (el) => {
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };

  // Desplaza hasta el día en la lista. Si el filtro lo oculta, se quita.
  // Se espera un frame para que React pinte la lista sin filtro.
  const irADia = (dia) => {
    const ocultoPorFiltro = soloSinConfirmar
      && !week.some((c) => c.scheduled_at.startsWith(dia) && c.status_name === 'scheduled');
    if (ocultoPorFiltro) setSoloSinConfirmar(false);
    requestAnimationFrame(() => desplazarA(porId(idDia(dia)) ?? porId(ID_SEMANA)));
  };

  // "Resto de la semana" lleva al primer día con citas después de mañana
  const primerDiaResto = week.find((c) => !c.scheduled_at.startsWith(tomorrow))?.scheduled_at.slice(0, 10);

  const revisarSinConfirmar = () => {
    setSoloSinConfirmar(true);
    requestAnimationFrame(() => desplazarA(porId(ID_SEMANA)));
  };

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

  // `next` es la acción que ofrece la fila (o null si no ofrece ninguna)
  const citaRow = (cita, next) => {
    const busy = changingId === cita.id;
    return (
      <Box key={cita.id}>
        <Box data-row sx={rowSx(cita)}>
          <Box sx={dotSx(cita)} />
          <Typography sx={{ fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums', minWidth: 44 }}>
            {formatHora(cita.scheduled_at)}
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
              onClick={() => handleAdvance(cita, next)}
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
  };

  // ── Bloques ─────────────────────────────────────────────────
  // Solo la primera carga muestra esqueleto o error a pantalla
  // completa; si un refresco falla se conservan los datos.
  const todayFirstError = !todayQ.loading && todayQ.error && todayQ.data === undefined;
  const todayReady      = todayQ.data !== undefined;

  const todayBlock = (
    <Paper elevation={0} sx={surfaceSx(true)}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5 }}>
        Hoy
        {todayReady && (
          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {` · ${today.length} ${today.length === 1 ? 'cita' : 'citas'}`}
          </Box>
        )}
      </Typography>

      {todayQ.loading && <ListRowsSkeleton rows={4} />}

      {todayFirstError && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>No se pudieron cargar las citas de hoy.</Alert>
      )}

      {todayReady && today.length === 0 && (
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

      {todayReady && today.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {today.map((cita) => citaRow(cita, NEXT_ACTION[cita.status_name]))}
        </Box>
      )}
    </Paper>
  );

  const weekFirstError = !weekQ.loading && weekQ.error && weekQ.data === undefined;
  const weekReady      = weekQ.data !== undefined;

  const weekBlock = (
    <Paper
      id={ID_SEMANA} tabIndex={-1} elevation={0}
      sx={{ ...surfaceSx(false), scrollMarginTop: 80, outline: 'none' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Esta semana
          {weekReady && (
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {` · ${visibles.length} ${visibles.length === 1 ? 'cita' : 'citas'}`}
            </Box>
          )}
        </Typography>
        {soloSinConfirmar && (
          <Chip
            label="Solo sin confirmar" size="small"
            onDelete={() => setSoloSinConfirmar(false)}
            sx={{
              borderColor: ACENTO_ACCION, color: 'text.primary',
              backgroundColor: alpha(ACENTO_ACCION, isDark ? 0.18 : 0.14),
            }}
            variant="outlined"
          />
        )}
      </Box>

      {weekQ.loading && <ListRowsSkeleton rows={3} />}

      {weekFirstError && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>No se pudieron cargar las citas de la semana.</Alert>
      )}

      {weekReady && diasSemana.length === 0 && (
        <Typography sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
          {soloSinConfirmar
            ? 'No hay citas sin confirmar de mañana en adelante'
            : 'No hay citas pendientes en los próximos días'}
        </Typography>
      )}

      {weekReady && diasSemana.map(({ dia, citas }, i) => (
        <Box
          key={dia} id={idDia(dia)} tabIndex={-1}
          sx={{ scrollMarginTop: 80, outline: 'none', mt: i > 0 ? 2.5 : 0 }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 1, letterSpacing: 0.2 }}>
            {tituloDia(dia)}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Antes de la fecha de la cita solo corresponde confirmar */}
            {citas.map((cita) => citaRow(cita, cita.status_name === 'scheduled' ? NEXT_ACTION.scheduled : null))}
          </Box>
        </Box>
      ))}
    </Paper>
  );

  const upcomingRows = [
    { label: 'Mañana',             count: tomorrowCount, dia: tomorrow },
    { label: 'Resto de la semana', count: weekCount,     dia: primerDiaResto },
  ];

  const upcomingBlock = (
    <Paper elevation={0} sx={surfaceSx(false)}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
        Próximas
      </Typography>
      {upcomingQ.loading && [0, 1].map((i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25 }}>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="text" width={24} sx={{ fontSize: 22 }} />
        </Box>
      ))}
      {!upcomingQ.loading && upcomingQ.error && upcomingQ.data === undefined && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>No se pudieron cargar las próximas citas.</Alert>
      )}
      {upcomingQ.data !== undefined && upcomingRows.map(({ label, count, dia }, i) => (
        <Box key={label}>
          {i > 0 && <Divider sx={{ borderColor: 'divider' }} />}
          {/* Clicable: desplaza la página hasta ese día en "Esta semana" */}
          <ButtonBase
            onClick={() => irADia(dia)} disabled={count === 0 || !dia}
            aria-label={`${label}: ${count} ${count === 1 ? 'cita' : 'citas'}. Ver en la lista de la semana`}
            sx={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              py: 1.25, px: 1, borderRadius: '8px', textAlign: 'left',
              transition: transition('background-color', 'fast', 'enter'),
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.06) },
              '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
            }}
          >
            <Typography component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>{label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="h5" component="span" sx={{ color: 'text.primary' }}>{count}</Typography>
              {count > 0 && dia && <ChevronRight sx={{ fontSize: 18, color: 'text.secondary', alignSelf: 'center' }} />}
            </Box>
          </ButtonBase>
        </Box>
      ))}
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
      {/* Filtra la lista de la semana en vez de ir a la agenda */}
      <Button
        size="small" endIcon={<ArrowForward />} onClick={revisarSinConfirmar}
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
          <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{CLINICA.nombre}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{CLINICA.lema}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {infoRow(AccessTime, CLINICA.horario.map((h) => (
          <Box key={h.dias}>
            {h.dias}: <Box component="span" sx={{ color: 'text.secondary' }}>{h.horas}</Box>
          </Box>
        )))}
        {infoRow(Phone, (
          <Link
            href={CLINICA.telefono.href}
            aria-label={`Llamar a ${CLINICA.nombre} al ${CLINICA.telefono.visible}`}
            underline="hover"
            sx={{ color: 'inherit' }}
          >
            {CLINICA.telefono.visible}
          </Link>
        ))}
        {infoRow(Place, `${CLINICA.direccion}, ${CLINICA.ciudad}`)}
      </Box>
    </Paper>
  );

  const kpis = totals && [
    { label: 'Citas este mes',       value: totals.appointments },
    { label: 'Tasa de inasistencia', value: totals.absenceRate, suffix: '%' },
    { label: 'Pacientes activos',    value: totals.activePatients },
  ];
  const kpiFirstError = !kpisQ.loading && kpisQ.error && kpisQ.data === undefined;

  // Índices de la entrada escalonada (orden visual)
  let order = 0;
  const reveal = (node) => <Reveal index={order++} reduceMotion={reduceMotion}>{node}</Reveal>;
  const gap = isMobile ? 2 : 3;

  return (
    <Box>
      {/* Encabezado: saludo y fecha a la izquierda, frescura a la derecha */}
      <Box sx={{
        mb: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', columnGap: 2, rowGap: 1,
      }}>
        <Box>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
            {saludo(ahora.getHours())}, {nombreVisible(user)}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: { xs: 13, sm: 14 } }}>
            {fechaLarga(ahora)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ textAlign: 'right' }} aria-live="polite">
            {lastUpdated && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {haceTexto(lastUpdated, ahora)}
              </Typography>
            )}
            {/* Aviso discreto: los datos siguen visibles */}
            {refreshFailed && !refreshing && (
              <Typography sx={{ fontSize: 12, color: 'warning.main' }}>
                No se pudo actualizar; se muestran los últimos datos
              </Typography>
            )}
          </Box>
          <Tooltip title="Actualizar">
            <span>
              <IconButton
                size="small" onClick={refreshAll} disabled={refreshing}
                aria-label="Actualizar" aria-busy={refreshing}
              >
                <Refresh sx={{
                  fontSize: 20,
                  ...(refreshing && {
                    animation: `${giro} 1s linear infinite`,
                    [REDUCED]: { animation: 'none' },
                  }),
                }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* En móvil se apila; el orden del JSX ya deja "Hoy" primero */}
      <Grid container spacing={gap}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap }}>
            {reveal(todayBlock)}
            {reveal(weekBlock)}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap }}>
            {reveal(upcomingBlock)}
            {upcomingQ.data !== undefined && reveal(unconfirmedBlock)}
            {reveal(clinicBlock)}
          </Box>
        </Grid>
      </Grid>

      {/* KPIs del mes en curso: solo admin y odontólogo */}
      {showKpis && (
        <Box sx={{ mt: gap }}>
          {kpiFirstError && <Alert severity="error" sx={{ borderRadius: '12px' }}>No se pudieron cargar los indicadores.</Alert>}
          {kpisQ.loading && (
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
                  <Reveal index={5 + i} reduceMotion={reduceMotion}>
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
