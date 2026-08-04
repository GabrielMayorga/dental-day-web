// src/pages/RecordsPage.jsx
// ============================================================
// Historias clínicas recientes: vista de solo lectura con las
// últimas historias clínicas registradas en toda la clínica
// (máx. 50, de más reciente a más antigua). Al hacer clic en
// una fila se navega a la ficha del paciente, donde está su
// historia clínica completa. Vive dentro del Layout (sin
// barra lateral ni cabecera propias).
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, CircularProgress, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import { MedicalInformation } from '@mui/icons-material';
import { getRecentRecords } from '../api/clinicalRecords';
import { useColorMode } from '../context/ThemeContext';

// ── Longitud máxima antes de truncar textos largos ───────────
const MAX_TEXT_LENGTH = 60;

// Trunca un texto con puntos suspensivos si excede el límite
const truncate = (text, max = MAX_TEXT_LENGTH) => {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

// Formatea un ISO a fecha legible en español: "28 jun 2026"
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
};

// ── Estilo compartido para las celdas de encabezado ──────────
const HEADER_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: 13,
  borderBottom: '2px solid rgba(10,31,68,0.10)',
};

const RecordsPage = () => {
  const navigate = useNavigate();
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // Fondo glass sutil adaptado al modo (mismo patrón que el resto del proyecto)
  const glassBg     = isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.70)';
  const glassBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRecentRecords();
      setRecords(data ?? []);
    } catch {
      setError('No se pudieron cargar las historias clínicas. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <Box>
      {/* Cabecera de sección */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
          Historias clínicas
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
          Registros clínicos más recientes
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
          {/* Estado vacío: sin historias clínicas */}
          {records.length === 0 && (
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
              <MedicalInformation sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Aún no hay historias clínicas registradas
              </Typography>
            </Paper>
          )}

          {/* Tabla de historias clínicas */}
          {records.length > 0 && (
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
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: 'rgba(10,31,68,0.04)' }}>
                      <TableCell sx={HEADER_CELL_SX}>Paciente</TableCell>
                      <TableCell sx={HEADER_CELL_SX}>Motivo de consulta</TableCell>
                      <TableCell sx={HEADER_CELL_SX}>Diagnóstico</TableCell>
                      <TableCell sx={HEADER_CELL_SX}>Odontólogo</TableCell>
                      <TableCell sx={{ ...HEADER_CELL_SX, whiteSpace: 'nowrap' }}>Fecha</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {records.map((record) => (
                      <TableRow
                        key={record.id}
                        hover
                        onClick={() => navigate(`/pacientes/${record.patient_id}`)}
                        sx={{
                          cursor: 'pointer',
                          '&:last-child td': { border: 0 },
                          transition: 'background-color 0.15s ease',
                          '&:hover': {
                            backgroundColor: isDark ? 'rgba(37,99,235,0.10)' : 'rgba(37,99,235,0.06)',
                          },
                        }}
                      >
                        {/* Paciente: destacado */}
                        <TableCell
                          sx={{
                            color: 'text.primary',
                            fontWeight: 600,
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {record.patient_name || '—'}
                        </TableCell>

                        {/* Motivo de consulta: truncado si es largo */}
                        <TableCell
                          sx={{
                            color: 'text.secondary',
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={record.chief_complaint || ''}
                        >
                          {truncate(record.chief_complaint)}
                        </TableCell>

                        {/* Diagnóstico: truncado si es largo */}
                        <TableCell
                          sx={{
                            color: 'text.secondary',
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={record.diagnosis || ''}
                        >
                          {truncate(record.diagnosis)}
                        </TableCell>

                        {/* Odontólogo */}
                        <TableCell
                          sx={{
                            color: 'text.secondary',
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {record.staff_name || '—'}
                        </TableCell>

                        {/* Fecha formateada */}
                        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {formatDate(record.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default RecordsPage;
