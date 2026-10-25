// src/pages/AuditPage.jsx
// ============================================================
// Registro de auditoría (solo admin): quién hizo qué, cuándo y
// desde dónde. Vive dentro del Layout.
//
// Filtros por usuario, tipo de acción y rango de fechas; 50
// registros por página (lo decide el backend). Al expandir una
// fila se ve lo que había antes y lo que quedó después.
// En móvil la tabla se reemplaza por tarjetas.
// ============================================================
import { Fragment, useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Alert, Chip, Button, IconButton, Collapse,
  Select, MenuItem, FormControl, InputLabel, Pagination, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Tooltip,
  useTheme, useMediaQuery,
} from '@mui/material';
import { KeyboardArrowDown, Policy, FilterAltOff } from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { esES } from '@mui/x-date-pickers/locales';
import 'dayjs/locale/es';
import { getAuditLogs } from '../api/audit';
import { getUsers } from '../api/users';
import { useColorMode } from '../context/ThemeContext';
import AnimatedList from '../components/AnimatedList';
import { TableRowsSkeleton, CardListSkeleton } from '../components/Skeletons';
import ComparacionCambios from '../components/auditoria/ComparacionCambios';
import { aHoraLocal, formatFecha, formatFechaHora, parseInstante } from '../utils/fechas';
import {
  ACCIONES, TIPOS, describirAccion, nombreTabla, idCorto,
} from '../utils/auditoria';

// ── Estilo compartido para las celdas de encabezado ──────────
const HEADER_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: 13,
  borderBottom: '2px solid rgba(10,31,68,0.10)',
  whiteSpace: 'nowrap',
};

const FILTROS_VACIOS = { usuario: '', accion: '', from: null, to: null };

// Hora de pared, sin zona: el backend interpreta from/to en la hora
// de la clínica y compara >= from y < to.
const toLocalParam = (date) => (date ? aHoraLocal(date.toDate()) : null);

// IPv4 mapeada a IPv6 (::ffff:1.2.3.4) → 1.2.3.4
const formatIp = (ip) => (ip ? ip.replace(/^::ffff:/, '') : '—');

// "del 1 de octubre de 2026 al 24 de octubre de 2026", "desde el ...", etc.
const describirRango = (from, to) => {
  if (!from && !to) return 'todo el historial';
  if (!to) return `desde el ${formatFecha(from.toDate())}`;
  if (!from) return `hasta el ${formatFecha(to.toDate())}`;
  if (from.isSame(to, 'day')) return `el ${formatFecha(from.toDate())}`;
  return `del ${formatFecha(from.toDate())} al ${formatFecha(to.toDate())}`;
};

// ── Chip de acción con el color de su tipo ───────────────────
const AccionChip = ({ log, isDark }) => {
  const { label, tipo } = describirAccion(log);
  const color = TIPOS[tipo][isDark ? 'dark' : 'light'];
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        background: `${color}1F`,   // ~12 % de opacidad
        color,
        fontWeight: 600,
        fontSize: 12,
        maxWidth: '100%',
        height: 'auto',
        '& .MuiChip-label': { whiteSpace: 'normal', py: 0.4 },
      }}
    />
  );
};

// Usuario de la fila. En un login fallido no hay usuario: se muestra
// el correo que se intentó.
const UsuarioCelda = ({ log }) => {
  if (log.user_name) {
    return <Typography sx={{ fontSize: 14, color: 'text.primary', fontWeight: 600 }}>{log.user_name}</Typography>;
  }
  return (
    <Box>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', fontStyle: 'italic' }}>
        {log.user_id ? 'Usuario sin nombre' : 'Sin sesión'}
      </Typography>
      {log.new_values?.email && log.action === 'LOGIN_FALLIDO' && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', wordBreak: 'break-all' }}>
          {log.new_values.email}
        </Typography>
      )}
    </Box>
  );
};

// "Paciente · 1866a1ff" con el UUID completo en el tooltip
const RegistroCelda = ({ log }) => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
    <Typography component="span" sx={{ fontSize: 14, color: 'text.primary' }}>
      {nombreTabla(log.table_name)}
    </Typography>
    {log.record_id && (
      <Tooltip title={log.record_id}>
        <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', fontFamily: 'monospace' }}>
          {idCorto(log.record_id)}
        </Typography>
      </Tooltip>
    )}
  </Box>
);

const AuditPage = () => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fondo glass sutil adaptado al modo (mismo patrón que el resto del proyecto)
  const glassBg     = isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.70)';
  const glassBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)';
  const glassPaper  = {
    borderRadius: '16px',
    border: glassBorder,
    background: glassBg,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  };
  const detalleBg = isDark ? 'rgba(13,17,23,0.45)' : 'rgba(10,31,68,0.025)';

  // ── Estado ───────────────────────────────────────────────────
  const [usuarios, setUsuarios]     = useState([]);
  const [filtros, setFiltros]       = useState(FILTROS_VACIOS);
  const [page, setPage]             = useState(1);
  const [logs, setLogs]             = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);   // primera carga
  const [refreshing, setRefreshing] = useState(false);  // filtros y páginas
  const [error, setError]           = useState('');
  const [expandida, setExpandida]   = useState(null);   // id de la fila abierta

  // Usuarios para el filtro (si falla, el filtro queda solo con "Todos")
  useEffect(() => {
    getUsers()
      .then((data) => setUsuarios(
        [...(data ?? [])].sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email, 'es')),
      ))
      .catch(() => {});
  }, []);

  // Un rango invertido no se consulta
  const invalidRange = Boolean(filtros.from && filtros.to && filtros.from.isAfter(filtros.to));
  const fromParam = toLocalParam(filtros.from);
  // El filtro "hasta" incluye el día elegido: se envían las 00:00 del siguiente
  const toParam   = toLocalParam(filtros.to?.add(1, 'day'));

  // Descarta respuestas viejas si el filtro cambia antes de que llegue
  const requestId = useRef(0);

  useEffect(() => {
    if (invalidRange) return;
    const id = ++requestId.current;
    const fetchLogs = async () => {
      setRefreshing(true);
      try {
        const result = await getAuditLogs({
          usuario: filtros.usuario,
          accion: filtros.accion,
          from: fromParam,
          to: toParam,
          page,
        });
        if (id !== requestId.current) return;
        setLogs(result.data ?? []);
        setPagination(result.pagination ?? null);
        setExpandida(null);
        setError('');
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err.response?.data?.error || 'No se pudo cargar el registro de auditoría. Intenta de nuevo más tarde.');
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    fetchLogs();
  }, [filtros.usuario, filtros.accion, fromParam, toParam, page, invalidRange]);

  // Cualquier cambio de filtro vuelve a la primera página
  const cambiarFiltro = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
    setPage(1);
  };

  const handleDateChange = (campo) => (value) => {
    cambiarFiltro(campo, value?.isValid() ? value.startOf('day') : null);
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setPage(1);
  };

  const handlePageChange = (_, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFila = (id) => setExpandida((prev) => (prev === id ? null : id));

  const hayFiltros = Boolean(filtros.usuario || filtros.accion || filtros.from || filtros.to);
  const total = pagination?.total ?? 0;
  const desde = total === 0 ? 0 : (page - 1) * (pagination?.pageSize ?? 50) + 1;
  const hasta = Math.min(page * (pagination?.pageSize ?? 50), total);

  // ── Barra de filtros ─────────────────────────────────────────
  const filtrosBar = (
    <Paper elevation={0} sx={{ ...glassPaper, borderRadius: '14px', position: 'relative', overflow: 'hidden', p: 2, mb: 3 }}>
      {refreshing && !loading && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 }} />
      )}

      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="es"
        localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            // Móvil: usuario y acción a lo ancho, las dos fechas lado a lado
            gridTemplateColumns: { xs: '1fr 1fr', lg: 'minmax(200px, 1.2fr) minmax(220px, 1.4fr) 195px 195px auto' },
            alignItems: 'center',
          }}
        >
          <FormControl size="small" fullWidth sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
            <InputLabel id="audit-usuario">Usuario</InputLabel>
            <Select
              labelId="audit-usuario"
              label="Usuario"
              value={filtros.usuario}
              onChange={(e) => cambiarFiltro('usuario', e.target.value)}
            >
              <MenuItem value="">Todos los usuarios</MenuItem>
              {usuarios.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                  {!u.is_active && (
                    <Typography component="span" sx={{ ml: 1, fontSize: 12, color: 'text.secondary' }}>(inactivo)</Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
            <InputLabel id="audit-accion">Tipo de acción</InputLabel>
            <Select
              labelId="audit-accion"
              label="Tipo de acción"
              value={filtros.accion}
              onChange={(e) => cambiarFiltro('accion', e.target.value)}
            >
              <MenuItem value="">Todas las acciones</MenuItem>
              {Object.entries(ACCIONES).map(([codigo, { label, tipo }]) => (
                <MenuItem key={codigo} value={codigo}>
                  <Box
                    component="span"
                    sx={{
                      width: 8, height: 8, borderRadius: '50%', mr: 1.25, flexShrink: 0,
                      background: TIPOS[tipo][isDark ? 'dark' : 'light'],
                    }}
                  />
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="Desde"
            value={filtros.from}
            onChange={handleDateChange('from')}
            maxDate={filtros.to ?? undefined}
            slotProps={{
              textField: { size: 'small', fullWidth: true },
              field: { clearable: true },
            }}
          />
          <DatePicker
            label="Hasta"
            value={filtros.to}
            onChange={handleDateChange('to')}
            minDate={filtros.from ?? undefined}
            slotProps={{
              textField: { size: 'small', fullWidth: true },
              field: { clearable: true },
            }}
          />

          <Button
            variant="text"
            startIcon={<FilterAltOff />}
            onClick={limpiarFiltros}
            disabled={!hayFiltros}
            sx={{ gridColumn: { xs: '1 / -1', lg: 'auto' }, justifySelf: { xs: 'stretch', lg: 'start' }, px: 1.5, whiteSpace: 'nowrap' }}
          >
            Limpiar
          </Button>
        </Box>
      </LocalizationProvider>

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
        {invalidRange
          ? 'La fecha "Desde" debe ser anterior o igual a "Hasta".'
          : `Mostrando ${describirRango(filtros.from, filtros.to)}`}
      </Typography>
    </Paper>
  );

  // ── Contenido: tarjetas (móvil) o tabla (escritorio) ─────────
  const vacio = (
    <Paper elevation={0} sx={{ ...glassPaper, py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      <Policy sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5 }} />
      <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', px: 2 }}>
        {hayFiltros ? 'No hay registros con estos filtros' : 'Aún no hay registros de auditoría'}
      </Typography>
    </Paper>
  );

  const tarjetas = (
    <AnimatedList refreshing={refreshing} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {logs.map((log) => {
        const abierta = expandida === log.id;
        return (
          <Paper key={log.id} elevation={0} sx={{ ...glassPaper, borderRadius: '14px', p: 1.75 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <AccionChip log={log} isDark={isDark} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap', mt: 0.4 }}>
                {formatFechaHora(parseInstante(log.created_at))}
              </Typography>
            </Box>

            <Box sx={{ mt: 1.25 }}>
              <UsuarioCelda log={log} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.75 }}>
              <RegistroCelda log={log} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary', fontFamily: 'monospace' }}>
                {formatIp(log.ip_address)}
              </Typography>
            </Box>

            <Button
              size="small"
              onClick={() => toggleFila(log.id)}
              endIcon={
                <KeyboardArrowDown sx={{ transition: 'transform 0.2s', transform: abierta ? 'rotate(180deg)' : 'none' }} />
              }
              sx={{ mt: 1, px: 1, py: 0.5 }}
              aria-expanded={abierta}
            >
              {abierta ? 'Ocultar detalle' : 'Ver detalle'}
            </Button>

            <Collapse in={abierta} unmountOnExit>
              <Box sx={{ mt: 1, p: 1.5, borderRadius: '10px', background: detalleBg }}>
                <ComparacionCambios log={log} apilado />
                {log.user_agent && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1.5, wordBreak: 'break-word' }}>
                    Navegador: {log.user_agent}
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Paper>
        );
      })}
    </AnimatedList>
  );

  const tabla = (
    <Paper elevation={0} sx={{ ...glassPaper, overflow: 'hidden', opacity: refreshing ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ background: 'rgba(10,31,68,0.04)' }}>
              <TableCell sx={{ ...HEADER_CELL_SX, width: 48 }} />
              <TableCell sx={HEADER_CELL_SX}>Fecha y hora</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Usuario</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Acción</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Registro</TableCell>
              <TableCell sx={HEADER_CELL_SX}>IP</TableCell>
            </TableRow>
          </TableHead>

          {/* TableBody simple: cada registro son dos filas (resumen +
              detalle), y AnimatedList necesita un solo hijo por elemento */}
          <TableBody>
            {logs.map((log) => {
              const abierta = expandida === log.id;
              return (
                <Fragment key={log.id}>
                  <TableRow
                    hover
                    onClick={() => toggleFila(log.id)}
                    sx={{
                      cursor: 'pointer',
                      '& > td': { borderBottom: abierta ? 'none' : undefined },
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(37,99,235,0.10)' : 'rgba(37,99,235,0.06)',
                      },
                    }}
                  >
                    <TableCell sx={{ pr: 0 }}>
                      <IconButton
                        size="small"
                        aria-label={abierta ? 'Ocultar detalle' : 'Ver detalle'}
                        aria-expanded={abierta}
                        onClick={(e) => { e.stopPropagation(); toggleFila(log.id); }}
                      >
                        <KeyboardArrowDown
                          fontSize="small"
                          sx={{ transition: 'transform 0.2s', transform: abierta ? 'rotate(180deg)' : 'none' }}
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap', fontSize: 14 }}>
                      {formatFechaHora(parseInstante(log.created_at))}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <UsuarioCelda log={log} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <AccionChip log={log} isDark={isDark} />
                    </TableCell>
                    <TableCell>
                      <RegistroCelda log={log} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatIp(log.ip_address)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0, borderBottom: abierta ? undefined : 'none' }}>
                      <Collapse in={abierta} unmountOnExit>
                        <Box sx={{ my: 1.5, p: 2, borderRadius: '12px', background: detalleBg }}>
                          <ComparacionCambios log={log} />
                          {log.user_agent && (
                            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 2, wordBreak: 'break-word' }}>
                              Navegador: {log.user_agent}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <Box>
      {/* Cabecera de sección */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
          Auditoría
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
          Registro de accesos y cambios en el sistema
        </Typography>
      </Box>

      {filtrosBar}

      {/* Estado: cargando (solo la primera vez) */}
      {loading && (isMobile ? (
        <CardListSkeleton count={5} lines={3} paperSx={{ border: glassBorder, background: glassBg }} />
      ) : (
        <Paper elevation={0} sx={{ ...glassPaper, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableBody>
                <TableRowsSkeleton rows={8} cols={6} />
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      {/* Estado: error */}
      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          {logs.length === 0 ? vacio : (isMobile ? tarjetas : tabla)}

          {/* Paginación */}
          {total > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                mt: 2.5,
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {desde}–{hasta} de {total} registros
              </Typography>
              {pagination.totalPages > 1 && (
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                  size={isMobile ? 'small' : 'medium'}
                  siblingCount={isMobile ? 0 : 1}
                />
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AuditPage;
