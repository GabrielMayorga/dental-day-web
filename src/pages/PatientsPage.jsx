// src/pages/PatientsPage.jsx
// ============================================================
// Módulo de pacientes: lista, búsqueda, alta, edición y
// desactivación de pacientes. Vive dentro del Layout.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../context/ThemeContext';
import {
  Box, Typography, Button, TextField, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Alert, Paper, IconButton, Tooltip,
} from '@mui/material';
import { Search, PersonAdd, Edit, Delete, Visibility } from '@mui/icons-material';
import { getPatients, createPatient, updatePatient, deletePatient } from '../api/patients';

// ── Opciones de los selects ──────────────────────────────────
const GENDER_OPTIONS = [
  { value: 'male',              label: 'Masculino' },
  { value: 'female',            label: 'Femenino' },
  { value: 'other',             label: 'Otro' },
  { value: 'prefer_not_to_say', label: 'Prefiero no decir' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ── Estado inicial del formulario ────────────────────────────
const EMPTY_FORM = {
  first_name: '',
  last_name:  '',
  birth_date: '',
  gender:     '',
  phone:      '',
  city:       '',
  blood_type: '',
  allergies:  '',
};

// ── Helpers ──────────────────────────────────────────────────

// Extrae "YYYY-MM-DD" de un ISO que puede traer hora
// Ejemplo: "1990-05-15T00:00:00.000Z" → "1990-05-15"
const toBirthDate = (iso) => (iso ? iso.substring(0, 10) : '');

// ── Estilo compartido para las celdas de encabezado ──────────
const HEADER_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: 13,
  borderBottom: '2px solid rgba(10,31,68,0.10)',
};

const PatientsPage = () => {
  const navigate = useNavigate();
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // Fondo glass adaptado al modo
  const glassBg = isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.70)';
  const glassBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)';
  const dialogBg = isDark ? 'rgba(22,27,34,0.92)' : 'rgba(255,255,255,0.92)';

  // ── Estado de la lista ───────────────────────────────────────
  const [patients, setPatients]       = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchText, setSearchText]   = useState('');

  // ── Estado del diálogo de crear / editar ────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId]   = useState(null); // null = crear, id = editar
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // ── Estado del diálogo de confirmación (desactivar) ─────────
  const [confirmPatient, setConfirmPatient] = useState(null); // null = cerrado
  const [deleting, setDeleting]             = useState(false);
  const [deleteError, setDeleteError]       = useState('');

  // ── Carga de pacientes ───────────────────────────────────────
  // fetchPatients se puede llamar con o sin query; siempre
  // actualiza el estado de la lista.
  const fetchPatients = useCallback(async (query = '') => {
    setLoadingList(true);
    try {
      const data = await getPatients(query);
      setPatients(data ?? []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ── Debounce de búsqueda (400 ms) ────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(searchText.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, fetchPatients]);

  // ── Manejo del formulario ────────────────────────────────────
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Abre el diálogo en modo CREAR
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  // Abre el diálogo en modo EDITAR precargado con los datos del paciente
  const handleOpenEdit = (patient) => {
    setEditingId(patient.id);
    setForm({
      first_name: patient.first_name || '',
      last_name:  patient.last_name  || '',
      birth_date: toBirthDate(patient.birth_date),
      gender:     patient.gender     || '',
      phone:      patient.phone      || '',
      city:       patient.city       || '',
      blood_type: patient.blood_type || '',
      allergies:  patient.allergies  || '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return; // evita cerrar mientras guarda
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      // Enviamos solo los campos con valor para no mandar strings vacíos
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '')
      );
      if (editingId) {
        await updatePatient(editingId, payload);
      } else {
        await createPatient(payload);
      }
      setDialogOpen(false);
      setEditingId(null);
      fetchPatients(searchText.trim()); // refresca la lista
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error al guardar el paciente'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Manejo de desactivación ──────────────────────────────────
  const handleOpenConfirm = (patient) => {
    setDeleteError('');
    setConfirmPatient(patient);
  };

  const handleCloseConfirm = () => {
    if (deleting) return; // evita cerrar durante la operación
    setConfirmPatient(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!confirmPatient) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deletePatient(confirmPatient.id);
      setConfirmPatient(null);
      fetchPatients(searchText.trim()); // refresca la lista
    } catch (err) {
      setDeleteError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error al desactivar el paciente'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <Box>
      {/* Cabecera de sección */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Pacientes
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Registro y consulta de pacientes de la clínica
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: '12px', px: 2.5 }}
        >
          Nuevo paciente
        </Button>
      </Box>

      {/* Buscador */}
      <TextField
        placeholder="Buscar por nombre…"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        size="small"
        sx={{ mb: 2.5, width: 320 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
          sx: { borderRadius: '12px', background: isDark ? 'rgba(22,27,34,0.65)' : 'rgba(255,255,255,0.7)' },
        }}
      />

      {/* Tabla envuelta en glass sutil */}
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
                <TableCell sx={HEADER_CELL_SX}>Nombre completo</TableCell>
                <TableCell sx={HEADER_CELL_SX}>Teléfono</TableCell>
                <TableCell sx={HEADER_CELL_SX}>Ciudad</TableCell>
                <TableCell sx={HEADER_CELL_SX}>Tipo de sangre</TableCell>
                <TableCell sx={{ ...HEADER_CELL_SX, width: 128, textAlign: 'center' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Estado: cargando */}
              {loadingList && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: 'secondary.main' }} />
                  </TableCell>
                </TableRow>
              )}

              {/* Estado: sin resultados */}
              {!loadingList && patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: 14 }}>
                    {searchText
                      ? `Sin resultados para "${searchText}"`
                      : 'No hay pacientes registrados aún'}
                  </TableCell>
                </TableRow>
              )}

              {/* Filas de pacientes */}
              {!loadingList && patients.map((p) => (
                <TableRow
                  key={p.id ?? p._id}
                  hover
                  sx={{ '&:last-child td': { border: 0 }, cursor: 'default' }}
                >
                  <TableCell sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {p.first_name} {p.last_name}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{p.phone || '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{p.city  || '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{p.blood_type || '—'}</TableCell>

                  {/* Acciones: ver detalle, editar y desactivar */}
                  <TableCell align="center" sx={{ py: 0.5 }}>
                    <Tooltip title="Ver detalle">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/pacientes/${p.id ?? p._id}`)}
                        sx={{ color: '#1D9E75' }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(p)}
                        sx={{ color: 'secondary.main' }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Desactivar">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenConfirm(p)}
                        sx={{ color: '#D32F2F', opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Diálogo: crear / editar paciente ───────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: dialogBg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.45)' : '0 20px 60px rgba(20,60,110,0.2)',
          },
        }}
      >
        {/* Título dinámico según el modo */}
        <DialogTitle sx={{ fontWeight: 600, color: 'text.primary', pb: 1 }}>
          {editingId ? 'Editar paciente' : 'Nuevo paciente'}
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Error del backend */}
          {formError && (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>
              {formError}
            </Alert>
          )}

          {/* Nombre y apellido en la misma fila */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Nombre *"
              name="first_name"
              value={form.first_name}
              onChange={handleFieldChange}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Apellido *"
              name="last_name"
              value={form.last_name}
              onChange={handleFieldChange}
              required
              fullWidth
              size="small"
            />
          </Box>

          {/* Fecha de nacimiento y género */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Fecha de nacimiento"
              name="birth_date"
              type="date"
              value={form.birth_date}
              onChange={handleFieldChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Género"
              name="gender"
              value={form.gender}
              onChange={handleFieldChange}
              fullWidth
              size="small"
            >
              {GENDER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Teléfono y ciudad */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Teléfono"
              name="phone"
              value={form.phone}
              onChange={handleFieldChange}
              fullWidth
              size="small"
            />
            <TextField
              label="Ciudad"
              name="city"
              value={form.city}
              onChange={handleFieldChange}
              fullWidth
              size="small"
            />
          </Box>

          {/* Tipo de sangre */}
          <TextField
            select
            label="Tipo de sangre"
            name="blood_type"
            value={form.blood_type}
            onChange={handleFieldChange}
            size="small"
            sx={{ width: '50%' }}
          >
            {BLOOD_TYPES.map((bt) => (
              <MenuItem key={bt} value={bt}>{bt}</MenuItem>
            ))}
          </TextField>

          {/* Alergias */}
          <TextField
            label="Alergias"
            name="allergies"
            value={form.allergies}
            onChange={handleFieldChange}
            multiline
            rows={2}
            size="small"
            fullWidth
            placeholder="Penicilina, látex…"
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            sx={{ borderRadius: '12px', color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.first_name || !form.last_name}
            sx={{ borderRadius: '12px', minWidth: 110 }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: confirmar desactivación ────────────────── */}
      <Dialog
        open={Boolean(confirmPatient)}
        onClose={handleCloseConfirm}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: dialogBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.45)' : '0 20px 60px rgba(20,60,110,0.15)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'text.primary', pb: 0.5 }}>
          ¿Desactivar paciente?
        </DialogTitle>

        <DialogContent>
          {/* Error del backend al eliminar */}
          {deleteError && (
            <Alert severity="error" sx={{ borderRadius: '12px', mb: 1.5 }}>
              {deleteError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            ¿Desactivar a{' '}
            <strong>
              {confirmPatient?.first_name} {confirmPatient?.last_name}
            </strong>
            ? Su historial se conservará pero dejará de aparecer en la lista.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseConfirm}
            disabled={deleting}
            sx={{ borderRadius: '12px', color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ borderRadius: '12px', minWidth: 110 }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientsPage;
