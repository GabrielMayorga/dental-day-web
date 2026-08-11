// src/pages/NotificationsPage.jsx
// ============================================================
// Panel de notificaciones: recordatorios de citas próximas
// agrupadas en "Hoy", "Mañana" y "Esta semana". Vive dentro
// del Layout (sin barra lateral ni cabecera propias).
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Divider, Alert,
} from '@mui/material';
import { Phone, EventBusy } from '@mui/icons-material';
import { getNotifications } from '../api/notifications';
import { translateStatus } from '../utils/appointmentStatus';
import { useColorMode } from '../context/ThemeContext';

// ── Secciones y su orden de aparición ───────────────────────
const GROUPS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'mañana', label: 'Mañana' },
  { key: 'semana', label: 'Esta semana' },
];

// Formatea un ISO a hora de 12 h con AM/PM: "4:00 PM"
const formatHour = (iso) => {
  const date = new Date(iso);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};

const NotificationsPage = () => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Fondo glass sutil adaptado al modo
  const glassBg     = isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.70)';
  const glassBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)';

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getNotifications();
      setData(result);
    } catch {
      setError('No se pudieron cargar las notificaciones. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Box>
      {/* Cabecera de sección */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h5"
          sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}
        >
          Notificaciones
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: { xs: 13, sm: 14 } }}>
          Recordatorios de citas próximas
        </Typography>
      </Box>

      {/* Estado: cargando */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: 'secondary.main' }} />
        </Box>
      )}

      {/* Estado: error */}
      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          {/* Contador de citas próximas */}
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
            Tienes <strong>{total}</strong> {total === 1 ? 'cita próxima' : 'citas próximas'}
          </Typography>

          {/* Estado vacío: sin citas próximas */}
          {total === 0 && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: glassBorder,
                background: glassBg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                py: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <EventBusy sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No hay citas próximas en los próximos 7 días
              </Typography>
            </Paper>
          )}

          {/* Secciones agrupadas: Hoy / Mañana / Esta semana */}
          {GROUPS.map(({ key, label }) => {
            const groupItems = items.filter((item) => item.group === key);
            if (groupItems.length === 0) return null;

            return (
              <Box key={key} sx={{ mb: 3.5 }}>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>
                  {label}
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: '16px',
                    border: glassBorder,
                    background: glassBg,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    overflow: 'hidden',
                  }}
                >
                  {groupItems.map((item, index) => {
                    // Número de teléfono "limpio" (solo dígitos y +) para el enlace tel:
                    const telHref = item.patient_phone
                      ? `tel:${item.patient_phone.replace(/[^\d+]/g, '')}`
                      : null;

                    return (
                      <Box key={item.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            // En móvil el contenido se apila para que nada se aplaste
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            gap: { xs: 1, sm: 2 },
                            px: { xs: 1.75, sm: 2.5 },
                            py: { xs: 1.5, sm: 2 },
                          }}
                        >
                          {/* Barra de color según el estado de la cita:
                              franja horizontal arriba en móvil, barra vertical en escritorio */}
                          <Box
                            sx={{
                              width: { xs: '100%', sm: 4 },
                              height: { xs: 4, sm: 'auto' },
                              alignSelf: 'stretch',
                              borderRadius: 4,
                              background: item.status_color,
                              flexShrink: 0,
                            }}
                          />

                          {/* Hora y duración */}
                          <Box sx={{ minWidth: { sm: 88 }, flexShrink: 0 }}>
                            <Typography
                              variant="body1"
                              sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: 14, sm: 16 } }}
                            >
                              {formatHour(item.scheduled_at)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {item.duration_minutes} min
                            </Typography>
                          </Box>

                          {/* Paciente, teléfono y odontólogo */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body1"
                              sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: 14, sm: 16 } }}
                            >
                              {item.patient_name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                              <Phone sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
                              {telHref ? (
                                // Enlace "tel:" para poder llamar con un toque desde el celular
                                <Typography
                                  component="a"
                                  href={telHref}
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline', color: 'secondary.main' },
                                  }}
                                >
                                  {item.patient_phone}
                                </Typography>
                              ) : (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  Sin teléfono
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
                              {item.staff_name}
                            </Typography>
                          </Box>

                          {/* Estado traducido */}
                          <Chip
                            label={translateStatus(item.status_name)}
                            size="small"
                            sx={{
                              alignSelf: { xs: 'flex-start', sm: 'center' },
                              fontWeight: 600,
                              color: item.status_color,
                              background: `${item.status_color}1A`, // 10% de opacidad
                              borderRadius: '8px',
                            }}
                          />
                        </Box>

                        {index < groupItems.length - 1 && <Divider sx={{ borderColor: 'divider' }} />}
                      </Box>
                    );
                  })}
                </Paper>
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
};

export default NotificationsPage;
