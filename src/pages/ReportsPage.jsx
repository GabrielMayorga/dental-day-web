// src/pages/ReportsPage.jsx
// ============================================================
// Panel de indicadores y gráficos. Vive dentro del Layout.
// Alcance: global (admin) → estadísticas de la clínica;
//          personal (odontólogo) → solo sus propias citas.
// ============================================================
import { useState, useEffect } from 'react';
import { useColorMode } from '../context/ThemeContext';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
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
  },
  {
    key:    'activePatients',
    label:  'Pacientes activos',
    icon:   People,
    color:  '#7C3AED',
  },
  {
    key:    'absenceRate',
    label:  'Tasa de inasistencia',
    icon:   PersonOff,
    color:  '#DC2626',
    suffix: '%',
  },
];

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

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Carga los datos del dashboard al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getDashboard();
        setData(result);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Spinner de carga ─────────────────────────────────────────
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 320,
        }}
      >
        <CircularProgress sx={{ color: '#2563EB' }} />
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

      {/* ── Fila de tarjetas KPI ─────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, suffix = '' }) => (
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
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Fila de gráficos ─────────────────────────────────── */}
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
    </Box>
  );
};

export default ReportsPage;
