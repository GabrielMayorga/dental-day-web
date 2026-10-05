// src/pages/ReportsPage.jsx
// ============================================================
// Panel de indicadores y gráficos. Vive dentro del Layout.
// Alcance: global (admin) → estadísticas de la clínica;
//          personal (odontólogo) → solo sus propias citas.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useColorMode } from '../context/ThemeContext';
import {
  Box, Typography, Paper, Grid, LinearProgress, Skeleton,
  ToggleButton, ToggleButtonGroup, Select, MenuItem,
  useTheme, useMediaQuery,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { esES } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  EventNote, Today, People, PersonOff,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { getDashboard } from '../api/reports';
import { translateStatus } from '../utils/appointmentStatus';
import { KpiSkeleton, ChartSkeleton } from '../components/Skeletons';

// ── Configuración de tarjetas KPI ───────────────────────────
// Cada entrada referencia una clave de `totals` y define
// el ícono y el color de acento de esa tarjeta.
const KPI_CONFIG = [
  {
    key:    'appointments',
    label:  'Total de citas',
    icon:   EventNote,
    color:  '#2563EB',
  },
  {
    key:    'today',
    label:  'Citas hoy',
    icon:   Today,
    color:  '#1D9E75',
    note:   'hoy',          // no depende del rango filtrado
  },
  {
    key:    'activePatients',
    label:  'Pacientes activos',
    icon:   People,
    color:  '#7C3AED',
    note:   'total actual', // no depende del rango filtrado
  },
  {
    key:    'absenceRate',
    label:  'Tasa de inasistencia',
    icon:   PersonOff,
    color:  '#DC2626',
    suffix: '%',
  },
];

// ── Filtro de período ───────────────────────────────────────
// En el estado, from es el primer día y to el ÚLTIMO día incluido
// (lo que muestran los DatePicker). Al enviar, to se convierte en
// las 00:00:00 del día siguiente, porque el backend compara
// >= from y < to. null = sin límite. 'custom' no es un preset:
// se activa al elegir fechas a mano.
const lastDayOf = (date, unit) => date.endOf(unit).startOf('day');

const PRESETS = [
  {
    key: 'month',
    label: 'Este mes',
    range: () => ({ from: dayjs().startOf('month'), to: lastDayOf(dayjs(), 'month') }),
  },
  {
    key: 'prevMonth',
    label: 'Mes anterior',
    range: () => {
      const prev = dayjs().subtract(1, 'month');
      return { from: prev.startOf('month'), to: lastDayOf(prev, 'month') };
    },
  },
  {
    key: 'last3',
    label: 'Últimos 3 meses',
    range: () => ({
      from: dayjs().subtract(2, 'month').startOf('month'),
      to:   lastDayOf(dayjs(), 'month'),
    }),
  },
  {
    key: 'year',
    label: 'Este año',
    range: () => ({ from: dayjs().startOf('year'), to: lastDayOf(dayjs(), 'year') }),
  },
  {
    key: 'all',
    label: 'Todo',
    range: () => ({ from: null, to: null }),
  },
];

const DEFAULT_PRESET = 'month';

const rangeForPreset = (key) => ({
  preset: key,
  ...PRESETS.find((p) => p.key === key).range(),
});

// Hora LOCAL, sin toISOString(): el backend espera hora de pared
// (scheduled_at es TIMESTAMP sin zona), no UTC.
const toLocalParam = (date) => (date ? date.format('YYYY-MM-DDTHH:mm:ss') : null);

// "1 — 31 de octubre de 2026", "1 de agosto — 31 de octubre de 2026",
// "1 de diciembre de 2025 — 31 de enero de 2026", etc.
const describeRange = (rawFrom, rawTo) => {
  // adapterLocale solo afecta a los pickers: aquí el locale va explícito
  const from = rawFrom?.locale('es');
  const to   = rawTo?.locale('es');
  const full = 'D [de] MMMM [de] YYYY';
  if (!from && !to) return 'todo el histórico';
  if (!to) return `desde el ${from.format(full)}`;
  if (!from) return `hasta el ${to.format(full)}`;
  if (from.isSame(to, 'day')) return to.format(full);
  if (from.isSame(to, 'month')) return `${from.format('D')} — ${to.format(full)}`;
  if (from.isSame(to, 'year')) return `${from.format('D [de] MMMM')} — ${to.format(full)}`;
  return `${from.format(full)} — ${to.format(full)}`;
};

// ── Tooltip personalizado del gráfico de dona ────────────────
// Recharts pasa `active`, `payload`. Devolvemos null si no hay
// elemento activo para que no aparezca un tooltip vacío.
const DonutTooltip = ({ active, payload, isDark }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <Box
      sx={{
        background: isDark ? '#1C2333' : '#fff',
        border: isDark
          ? '1px solid rgba(255,255,255,0.10)'
          : '1px solid rgba(10,31,68,0.10)',
        borderRadius: '10px',
        px: 1.5,
        py: 1,
      }}
    >
      <Typography sx={{ fontSize: 13, color: isDark ? '#E6EDF3' : '#0A1F44', fontWeight: 600 }}>
        {name}
      </Typography>
      <Typography sx={{ fontSize: 12, color: isDark ? '#9DA7B3' : '#5A6B85' }}>
        {value} cita{value !== 1 ? 's' : ''}
      </Typography>
    </Box>
  );
};

// ── Tooltip personalizado del gráfico de barras ──────────────
const BarTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        background: isDark ? '#1C2333' : '#fff',
        border: isDark
          ? '1px solid rgba(255,255,255,0.10)'
          : '1px solid rgba(10,31,68,0.10)',
        borderRadius: '10px',
        px: 1.5,
        py: 1,
      }}
    >
      <Typography sx={{ fontSize: 13, color: isDark ? '#E6EDF3' : '#0A1F44', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 12, color: isDark ? '#9DA7B3' : '#5A6B85' }}>
        {payload[0].value} cita{payload[0].value !== 1 ? 's' : ''}
      </Typography>
    </Box>
  );
};

// ── Componente principal ─────────────────────────────────────
const ReportsPage = () => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // Tokens de estilo glass coherentes con el resto de la app
  const glassBg     = isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.70)';
  const glassBorder = isDark
    ? '1px solid rgba(255,255,255,0.08)'
    : '1px solid rgba(255,255,255,0.6)';

  // Color de ejes y grillas de recharts según el modo
  const chartAxisColor = isDark ? '#9DA7B3' : '#5A6B85';
  const chartGridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,31,68,0.07)';

  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);   // primera carga
  const [refreshing, setRefreshing] = useState(false);  // recargas por filtro
  const [range, setRange]           = useState(() => rangeForPreset(DEFAULT_PRESET));

  // Un rango personalizado invertido no se consulta
  const invalidRange = Boolean(range.from && range.to && range.from.isAfter(range.to));
  const fromParam = toLocalParam(range.from);
  const toParam   = toLocalParam(range.to?.add(1, 'day'));

  // Identifica la última petición para descartar respuestas viejas
  // si el usuario cambia el filtro antes de que termine la anterior.
  const requestId = useRef(0);

  // Carga (o recarga) los datos cada vez que cambia el rango.
  // Tras la primera carga no se desmonta nada: solo se marca
  // `refreshing` para mostrar la barra de progreso.
  useEffect(() => {
    if (invalidRange) return;
    const id = ++requestId.current;
    const fetchData = async () => {
      setRefreshing(true);
      try {
        const result = await getDashboard({ from: fromParam, to: toParam });
        if (id === requestId.current) setData(result);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    fetchData();
  }, [fromParam, toParam, invalidRange]);

  const handlePresetChange = (key) => {
    if (key && key !== 'custom') setRange(rangeForPreset(key));
  };

  // Editar una fecha a mano pasa el filtro a "personalizado"
  const handleDateChange = (field) => (value) => {
    const date = value?.isValid() ? value.startOf('day') : null;
    setRange((prev) => ({ ...prev, preset: 'custom', [field]: date }));
  };

  // ── Esqueleto de carga ───────────────────────────────────────
  if (loading) {
    // Esqueleto con la forma del panel: filtros, 4 KPIs y 2 gráficos
    const paperSx = { border: glassBorder, background: glassBg };
    return (
      <Box>
        <Skeleton variant="text" width={220} sx={{ fontSize: 28 }} />
        <Skeleton variant="text" width={300} sx={{ fontSize: 14, mb: 3 }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: '14px', mb: 3 }} />
        <Box sx={{ display: 'grid', gap: 2, mb: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          {[0, 1, 2, 3].map((i) => <KpiSkeleton key={i} paperSx={paperSx} />)}
        </Box>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <ChartSkeleton paperSx={paperSx} />
          <ChartSkeleton paperSx={paperSx} />
        </Box>
      </Box>
    );
  }

  // Desestructura con valores por defecto para manejar datos vacíos
  const {
    scope     = 'global',
    byStatus  = [],
    totals    = {},
    byDentist = [],
  } = data ?? {};

  // Prepara los datos del gráfico de dona traduciendo el nombre del estado
  const pieData = byStatus.map((item) => ({
    name:  translateStatus(item.name),
    value: item.total,
    color: item.color_hex,
  }));

  // Período sin citas: los 6 estados llegan en cero y el donut
  // quedaría vacío, así que se muestra un mensaje en su lugar.
  const hasAppointments = (totals.appointments ?? 0) > 0;

  // El gráfico de barras solo aparece cuando hay datos (rol admin)
  const showDentistChart = byDentist.length > 0;

  // ── Render ───────────────────────────────────────────────────
  return (
    <Box>
      {/* Cabecera: título + subtítulo de alcance */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
          Reportes
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
          {scope === 'personal' ? 'Tus estadísticas' : 'Estadísticas de la clínica'}
        </Typography>
      </Box>

      {/* ── Barra de filtro de período ───────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '14px',
          border: glassBorder,
          background: glassBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          p: 2,
          mb: 3,
        }}
      >
        {refreshing && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }} />
        )}

        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale="es"
          localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            {/* Presets: ToggleButtonGroup en escritorio, Select en móvil */}
            {isMobile ? (
              <Select
                size="small"
                fullWidth
                value={range.preset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                {PRESETS.map(({ key, label }) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
                <MenuItem value="custom" disabled>Personalizado</MenuItem>
              </Select>
            ) : (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={range.preset}
                onChange={(_, key) => handlePresetChange(key)}
              >
                {PRESETS.map(({ key, label }) => (
                  <ToggleButton key={key} value={key} sx={{ px: 1.5, textTransform: 'none' }}>
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}

            {/* Rango personalizado */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 1.5,
                flex: isMobile ? '1 1 100%' : '0 1 auto',
              }}
            >
              <DatePicker
                label="Desde"
                value={range.from}
                onChange={handleDateChange('from')}
                maxDate={range.to ?? undefined}
                slotProps={{
                  textField: { size: 'small', sx: { width: isMobile ? '100%' : 170 } },
                  field: { clearable: true },
                }}
              />
              <DatePicker
                label="Hasta"
                value={range.to}
                onChange={handleDateChange('to')}
                minDate={range.from ?? undefined}
                slotProps={{
                  textField: { size: 'small', sx: { width: isMobile ? '100%' : 170 } },
                  field: { clearable: true },
                }}
              />
            </Box>
          </Box>
        </LocalizationProvider>

        {/* Período mostrado */}
        <Typography
          variant="body2"
          sx={{ mt: 1.5, color: invalidRange ? 'error.main' : 'text.secondary' }}
        >
          {invalidRange
            ? 'La fecha "Desde" debe ser anterior a "Hasta".'
            : `Mostrando: ${describeRange(range.from, range.to)}`}
        </Typography>
      </Paper>

      {/* Contenido atenuado durante la recarga, sin desmontar los gráficos */}
      <Box sx={{ opacity: refreshing ? 0.55 : 1, transition: 'opacity 0.2s' }}>

      {/* ── Fila de tarjetas KPI ─────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, suffix = '', note }) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: glassBorder,
                background: glassBg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                height: '100%',
              }}
            >
              {/* Ícono con fondo de color suave */}
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  // Fondo semitransparente usando el color del acento + opacidad 15%
                  background: `${color}26`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon sx={{ color, fontSize: 24 }} />
              </Box>

              {/* Valor y etiqueta */}
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}
                >
                  {totals[key] ?? 0}{suffix}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                  {label}
                </Typography>
                {/* Aclara que el KPI no pertenece al período filtrado */}
                {note && (
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{ color: 'text.disabled', fontSize: 11, lineHeight: 1.2 }}
                  >
                    {note}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Fila de gráficos ─────────────────────────────────── */}
      {!hasAppointments ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: glassBorder,
            background: glassBg,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Sin citas en este período
          </Typography>
        </Paper>
      ) : (
      <Grid container spacing={2}>

        {/* Gráfico de dona: citas por estado */}
        <Grid item xs={12} md={showDentistChart ? 5 : 6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: glassBorder,
              background: glassBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
              Citas por estado
            </Typography>

            {pieData.length === 0 ? (
              // Estado vacío
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 260,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Sin datos disponibles
                </Typography>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip content={<DonutTooltip isDark={isDark} />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Leyenda manual: punto de color + nombre del estado */}
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 1.5,
                    mt: 1.5,
                  }}
                >
                  {pieData.map((entry) => (
                    <Box
                      key={entry.name}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: entry.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                        {entry.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Gráfico de barras: citas por odontólogo (solo admin) */}
        {showDentistChart && (
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: glassBorder,
                background: glassBg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                p: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                Citas por odontólogo
              </Typography>

              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={byDentist}
                  margin={{ top: 4, right: 16, left: -10, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartGridColor}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dentist"
                    tick={{ fontSize: 12, fill: chartAxisColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: chartAxisColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReTooltip
                    content={<BarTooltip isDark={isDark} />}
                    cursor={{
                      fill: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(10,31,68,0.04)',
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
      )}
      </Box>
    </Box>
  );
};

export default ReportsPage;
