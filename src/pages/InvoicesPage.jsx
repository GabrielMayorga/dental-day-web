// src/pages/InvoicesPage.jsx
// ============================================================
// Módulo de facturación: listado con filtro por estado, detalle
// de factura con sus renglones y cambio de estado, y alta de
// nuevas facturas. Responsive: tabla en escritorio, tarjetas
// apiladas en móvil (mismo patrón que PatientsPage).
// ============================================================
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useColorMode } from '../context/ThemeContext';
import {
  Box, Typography, Button, TextField,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Alert, Paper, IconButton, Tooltip, Chip, Divider, Stack,
  FormControl, InputLabel, Select, Autocomplete, useTheme, useMediaQuery,
} from '@mui/material';
import { Add, Delete, Visibility } from '@mui/icons-material';
import { getInvoices, getInvoice, createInvoice, changeInvoiceStatus } from '../api/invoices';
import { getPatients } from '../api/patients';
import { getTreatments } from '../api/treatments';

// ── Traducción y color de los estados de factura ─────────────
const STATUS_LABELS = {
  pending:   'Pendiente',
  paid:      'Pagada',
  cancelled: 'Anulada',
};

const STATUS_COLORS = {
  pending:   '#d97706', // ámbar
  paid:      '#16a34a', // verde
  cancelled: '#dc2626', // rojo
};

// ── Opciones del filtro de estado ────────────────────────────
const STATUS_FILTERS = [
  { value: '',          label: 'Todas' },
  { value: 'pending',   label: 'Pendientes' },
  { value: 'paid',      label: 'Pagadas' },
  { value: 'cancelled', label: 'Anuladas' },
];

// ── Helpers de formato ────────────────────────────────────────

// Los montos llegan como string desde el backend (ej. "1500.00");
// se convierten con Number() y se formatean como córdobas.
const numberFormatter = new Intl.NumberFormat('es-NI', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatCurrency = (value) => `C$ ${numberFormatter.format(Number(value) || 0)}`;

// Fecha legible en español: "25 de junio de 2026"
const formatDateES = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

// ── Estilo compartido para las celdas de encabezado de tabla ──
const HEADER_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: 13,
  borderBottom: '2px solid rgba(10,31,68,0.10)',
};

// Fila "etiqueta / valor" del resumen de totales. Se reutiliza tanto
// en el diálogo de detalle como en el de nueva factura.
const SummaryRow = ({ label, value, bold = false }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
    <Typography
      variant={bold ? 'body1' : 'body2'}
      sx={{ color: bold ? 'text.primary' : 'text.secondary', fontWeight: bold ? 700 : 500 }}
    >
      {label}
    </Typography>
    <Typography
      variant={bold ? 'body1' : 'body2'}
      sx={{
        color: bold ? 'secondary.main' : 'text.primary',
        fontWeight: bold ? 700 : 500,
        fontSize: bold ? '1.05rem' : undefined,
      }}
    >
      {value}
    </Typography>
  </Box>
);

// Chip de estado reutilizado en tabla, tarjetas y diálogo de detalle
const StatusChip = ({ status }) => (
  <Chip
    label={STATUS_LABELS[status] || status}
    size="small"
    sx={{
      fontWeight: 600,
      color: STATUS_COLORS[status] || 'text.secondary',
      background: `${STATUS_COLORS[status] || '#999999'}1A`, // 10% de opacidad
      borderRadius: '8px',
    }}
  />
);

// Estado inicial del selector para agregar un renglón
const EMPTY_LINE_FORM = { treatment_id: '', quantity: 1 };

const InvoicesPage = () => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // Detección de móvil (menor al breakpoint 'md') para alternar
  // tabla/tarjetas y activar los diálogos a pantalla completa
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fondo glass adaptado al modo (mismo patrón que PatientsPage)
  const glassBg = isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.70)';
  const glassBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)';
  const dialogBg = isDark ? 'rgba(22,27,34,0.92)' : 'rgba(255,255,255,0.92)';
  const lineItemBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(10,31,68,0.02)';

  // ── Estado de la lista ───────────────────────────────────────
  const [invoices, setInvoices]         = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // ── Estado del diálogo de detalle de factura ──────────────────
  const [detailOpen, setDetailOpen]         = useState(false);
  const [detailInvoice, setDetailInvoice]   = useState(null); // factura completa + renglones
  const [detailLoading, setDetailLoading]   = useState(false);
  const [detailError, setDetailError]       = useState('');
  const [statusChanging, setStatusChanging] = useState(false);

  // ── Estado del diálogo de nueva factura ───────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // Autocomplete de paciente (búsqueda en el servidor con debounce)
  const [patientOptions, setPatientOptions]   = useState([]);
  const [patientInput, setPatientInput]       = useState('');
  const [patientLoading, setPatientLoading]   = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const patientDebounce = useRef(null);

  // Catálogo de tratamientos: se carga la primera vez que se abre el diálogo
  const [treatments, setTreatments] = useState([]);
  const catalogsLoaded = useRef(false);

  // Selector para agregar un renglón a la factura en curso
  const [lineForm, setLineForm] = useState(EMPTY_LINE_FORM);
  const [lineItems, setLineItems] = useState([]); // { treatment_id, name, quantity, unit_price }

  // Descuento y notas de la nueva factura
  const [discount, setDiscount] = useState('');
  const [notes, setNotes]       = useState('');

  // ── Carga de facturas ─────────────────────────────────────────
  const fetchInvoices = useCallback(async (status = '') => {
    setLoadingList(true);
    try {
      const data = await getInvoices(status ? { status } : {});
      setInvoices(data ?? []);
    } catch {
      setInvoices([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(statusFilter);
  }, [statusFilter, fetchInvoices]);

  // ── Carga de catálogos ─────────────────────────────────────────

  // Tratamientos: se cargan la primera vez que se abre el diálogo de nueva factura
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

  // Búsqueda de pacientes con debounce (400 ms), igual que en AgendaPage
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

  // ── Detalle de factura ──────────────────────────────────────────

  const handleOpenDetail = useCallback(async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailInvoice(null);
    try {
      const full = await getInvoice(id);
      setDetailInvoice(full);
    } catch {
      setDetailError('No se pudo cargar el detalle de la factura.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    if (statusChanging) return; // evita cerrar mientras se procesa un cambio de estado
    setDetailOpen(false);
    setDetailInvoice(null);
    setDetailError('');
  }, [statusChanging]);

  // Marca la factura del detalle como pagada o anulada, luego cierra y recarga la lista
  const handleChangeStatus = useCallback(async (newStatus) => {
    if (!detailInvoice) return;
    setStatusChanging(true);
    setDetailError('');
    try {
      await changeInvoiceStatus(detailInvoice.id, newStatus);
      setDetailOpen(false);
      setDetailInvoice(null);
      fetchInvoices(statusFilter);
    } catch (err) {
      setDetailError(
        err.response?.data?.error || 'Error al cambiar el estado de la factura.'
      );
    } finally {
      setStatusChanging(false);
    }
  }, [detailInvoice, fetchInvoices, statusFilter]);

  // ── Diálogo de nueva factura ────────────────────────────────────

  const handleOpenCreate = () => {
    setSelectedPatient(null);
    setPatientInput('');
    setPatientOptions([]);
    setLineForm(EMPTY_LINE_FORM);
    setLineItems([]);
    setDiscount('');
    setNotes('');
    setFormError('');
    loadCatalogs();
    setDialogOpen(true);
  };

  const handleCloseCreate = () => {
    if (saving) return; // evita cerrar mientras guarda
    setDialogOpen(false);
  };

  // Agrega el tratamiento seleccionado a la lista de renglones. Si ya
  // estaba agregado, suma la cantidad en vez de duplicar la fila.
  const handleAddLineItem = () => {
    const treatment = treatments.find((t) => String(t.id) === String(lineForm.treatment_id));
    const qty = Number(lineForm.quantity);
    if (!treatment || !qty || qty < 1) return;

    setLineItems((prev) => {
      const existing = prev.find((li) => li.treatment_id === treatment.id);
      if (existing) {
        return prev.map((li) =>
          li.treatment_id === treatment.id ? { ...li, quantity: li.quantity + qty } : li
        );
      }
      return [
        ...prev,
        {
          treatment_id: treatment.id,
          name: treatment.name,
          quantity: qty,
          unit_price: Number(treatment.base_price),
        },
      ];
    });

    setLineForm(EMPTY_LINE_FORM);
  };

  const handleRemoveLineItem = (treatmentId) => {
    setLineItems((prev) => prev.filter((li) => li.treatment_id !== treatmentId));
  };

  // Totales calculados en vivo a partir de los renglones agregados
  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.unit_price * li.quantity, 0),
    [lineItems]
  );
  const discountValue = Number(discount) || 0;
  const total = Math.max(subtotal - discountValue, 0);

  const handleSave = async () => {
    if (!selectedPatient || lineItems.length === 0) return; // el botón ya lo previene

    setSaving(true);
    setFormError('');
    try {
      await createInvoice({
        patient_id: selectedPatient.id,
        discount: discountValue || undefined,
        notes: notes || undefined,
        items: lineItems.map((li) => ({ treatment_id: li.treatment_id, quantity: li.quantity })),
      });
      setDialogOpen(false);
      fetchInvoices(statusFilter);
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error al crear la factura.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <Box>
      {/* Cabecera de sección: se apila en móvil */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1.5, md: 0 },
          mb: { xs: 2, md: 3 },
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.15rem', md: '1.5rem' } }}
          >
            Facturación
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3, fontSize: { xs: 13, md: 14 } }}>
            Emisión y control de pagos de la clínica
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: '12px', px: 2.5, width: { xs: '100%', md: 'auto' } }}
        >
          Nueva factura
        </Button>
      </Box>

      {/* Filtro de estado: ancho completo en móvil */}
      <FormControl
        size="small"
        sx={{ mb: { xs: 2, md: 2.5 }, minWidth: 200, width: { xs: '100%', md: 'auto' } }}
      >
        <InputLabel>Estado</InputLabel>
        <Select
          label="Estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {isMobile ? (
        // ── Lista de tarjetas (móvil): reemplaza la tabla ──────
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {loadingList && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: 'secondary.main' }} />
            </Box>
          )}

          {!loadingList && invoices.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary', fontSize: 14 }}>
              {statusFilter ? 'No hay facturas con este estado' : 'No hay facturas registradas aún'}
            </Box>
          )}

          {!loadingList && invoices.map((inv) => (
            <Paper
              key={inv.id}
              elevation={0}
              onClick={() => handleOpenDetail(inv.id)}
              sx={{
                borderRadius: '14px',
                border: glassBorder,
                background: glassBg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                p: 1.75,
                cursor: 'pointer',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 15 }}>
                  {inv.patient_name}
                </Typography>
                <StatusChip status={inv.status} />
              </Box>

              <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.5 }}>
                {formatDateES(inv.issued_at)}
              </Typography>

              <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 17, mt: 0.75 }}>
                {formatCurrency(inv.final_amount)}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Tooltip title="Ver detalle">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleOpenDetail(inv.id); }}
                    sx={{ color: '#1D9E75' }}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        // ── Tabla (escritorio) ──────────────────────────────────
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
                  <TableCell sx={HEADER_CELL_SX}>Fecha</TableCell>
                  <TableCell sx={HEADER_CELL_SX}>Total</TableCell>
                  <TableCell sx={HEADER_CELL_SX}>Estado</TableCell>
                  <TableCell sx={{ ...HEADER_CELL_SX, width: 88, textAlign: 'center' }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loadingList && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: 'secondary.main' }} />
                    </TableCell>
                  </TableRow>
                )}

                {!loadingList && invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: 14 }}>
                      {statusFilter ? 'No hay facturas con este estado' : 'No hay facturas registradas aún'}
                    </TableCell>
                  </TableRow>
                )}

                {!loadingList && invoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    hover
                    onClick={() => handleOpenDetail(inv.id)}
                    sx={{ '&:last-child td': { border: 0 }, cursor: 'pointer' }}
                  >
                    <TableCell sx={{ color: 'text.primary', fontWeight: 500 }}>{inv.patient_name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{formatDateES(inv.issued_at)}</TableCell>
                    <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {formatCurrency(inv.final_amount)}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={inv.status} />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      <Tooltip title="Ver detalle">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleOpenDetail(inv.id); }}
                          sx={{ color: '#1D9E75' }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Diálogo: detalle de factura ─────────────────────── */}
      <Dialog
        open={detailOpen}
        onClose={handleCloseDetail}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, md: '20px' },
            background: dialogBg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.45)' : '0 20px 60px rgba(20,60,110,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'text.primary', pb: 0.5, fontSize: { xs: 17, md: 20 } }}>
          {detailInvoice?.patient_name || 'Detalle de factura'}
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, md: 3 } }}>
          {detailLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} sx={{ color: 'secondary.main' }} />
            </Box>
          )}

          {!detailLoading && detailError && (
            <Alert severity="error" sx={{ borderRadius: '12px', mb: 2 }}>
              {detailError}
            </Alert>
          )}

          {!detailLoading && detailInvoice && (
            <Stack spacing={2}>
              {/* Fecha y estado */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {formatDateES(detailInvoice.issued_at)}
                </Typography>
                <StatusChip status={detailInvoice.status} />
              </Box>

              {/* Teléfono del paciente, si viene en la respuesta */}
              {detailInvoice.patient_phone && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Tel: {detailInvoice.patient_phone}
                </Typography>
              )}

              <Divider />

              {/* Renglones de la factura (con scroll horizontal en pantallas muy angostas) */}
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HEADER_CELL_SX}>Descripción</TableCell>
                      <TableCell sx={{ ...HEADER_CELL_SX, textAlign: 'center' }}>Cant.</TableCell>
                      <TableCell sx={{ ...HEADER_CELL_SX, textAlign: 'right' }}>P. unit.</TableCell>
                      <TableCell sx={{ ...HEADER_CELL_SX, textAlign: 'right' }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detailInvoice.items || []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ color: 'text.primary' }}>{item.description}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', textAlign: 'center' }}>{item.quantity}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', textAlign: 'right' }}>
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', textAlign: 'right' }}>
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Divider />

              {/* Resumen: subtotal, descuento y total destacado */}
              <Box>
                <SummaryRow label="Subtotal" value={formatCurrency(detailInvoice.total_amount)} />
                <SummaryRow label="Descuento" value={`- ${formatCurrency(detailInvoice.discount)}`} />
                <SummaryRow label="Total" value={formatCurrency(detailInvoice.final_amount)} bold />
              </Box>

              {/* Notas */}
              {detailInvoice.notes && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Notas</Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>{detailInvoice.notes}</Typography>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        {/* En móvil los botones se apilan a ancho completo con espaciado vertical */}
        <DialogActions
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          {/* Cambios de estado: solo disponibles si la factura está pendiente */}
          {detailInvoice?.status === 'pending' && (
            <>
              <Button
                onClick={() => handleChangeStatus('paid')}
                disabled={statusChanging}
                variant="outlined"
                sx={{
                  borderRadius: '8px', borderColor: '#16a34a', color: '#16a34a',
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': { backgroundColor: '#16a34a14', borderColor: '#16a34a' },
                }}
              >
                Marcar como pagada
              </Button>
              <Button
                onClick={() => handleChangeStatus('cancelled')}
                disabled={statusChanging}
                variant="outlined"
                sx={{
                  borderRadius: '8px', borderColor: '#dc2626', color: '#dc2626',
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': { backgroundColor: '#dc262614', borderColor: '#dc2626' },
                }}
              >
                Anular factura
              </Button>
            </>
          )}
          <Button
            onClick={handleCloseDetail}
            disabled={statusChanging}
            variant="contained"
            sx={{ borderRadius: '8px', width: { xs: '100%', sm: 'auto' } }}
          >
            {statusChanging ? <CircularProgress size={20} color="inherit" /> : 'Cerrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: nueva factura ───────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseCreate}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, md: '20px' },
            background: dialogBg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.45)' : '0 20px 60px rgba(20,60,110,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'text.primary', pb: 1, fontSize: { xs: 17, md: 20 } }}>
          Nueva factura
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {formError && (
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
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
              onChange={(_, newValue) => setSelectedPatient(newValue)}
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

            <Divider />

            {/* Agregar tratamientos a la factura */}
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Tratamientos
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tratamiento</InputLabel>
                <Select
                  label="Tratamiento"
                  value={lineForm.treatment_id}
                  onChange={(e) => setLineForm((prev) => ({ ...prev, treatment_id: e.target.value }))}
                >
                  {treatments.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name} — {formatCurrency(t.base_price)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Cantidad"
                type="number"
                size="small"
                value={lineForm.quantity}
                onChange={(e) => setLineForm((prev) => ({ ...prev, quantity: e.target.value }))}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                sx={{ width: { xs: '100%', sm: 120 } }}
              />

              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddLineItem}
                disabled={!lineForm.treatment_id || Number(lineForm.quantity) < 1}
                sx={{ borderRadius: '8px', width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
              >
                Agregar
              </Button>
            </Box>

            {/* Renglones agregados a la factura en curso */}
            {lineItems.length > 0 && (
              <Stack spacing={1}>
                {lineItems.map((li) => (
                  <Box
                    key={li.treatment_id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: '10px',
                      border: glassBorder,
                      background: lineItemBg,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {li.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {li.quantity} × {formatCurrency(li.unit_price)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {formatCurrency(li.unit_price * li.quantity)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveLineItem(li.treatment_id)}
                      sx={{ color: '#dc2626' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}

            <Divider />

            {/* Descuento y notas */}
            <TextField
              label="Descuento (opcional)"
              type="number"
              size="small"
              fullWidth
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            />
            <TextField
              label="Notas (opcional)"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Divider />

            {/* Totales en vivo */}
            <Box>
              <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
              <SummaryRow label="Descuento" value={`- ${formatCurrency(discountValue)}`} />
              <SummaryRow label="Total a pagar" value={formatCurrency(total)} bold />
            </Box>
          </Stack>
        </DialogContent>

        {/* En móvil los botones se apilan a ancho completo */}
        <DialogActions
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Button
            onClick={handleCloseCreate}
            disabled={saving}
            sx={{ borderRadius: '12px', color: 'text.secondary', width: { xs: '100%', sm: 'auto' } }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !selectedPatient || lineItems.length === 0}
            sx={{ borderRadius: '12px', minWidth: 140, width: { xs: '100%', sm: 'auto' } }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Crear factura'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoicesPage;
