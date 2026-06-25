// src/pages/PatientsPage.jsx
// ============================================================
// Módulo de pacientes: lista, búsqueda y alta de nuevos
// pacientes. Vive dentro del Layout, sin cabecera propia.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Alert, Paper,
} from '@mui/material';
import { Search, PersonAdd } from '@mui/icons-material';
import { getPatients, createPatient } from '../api/patients';

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

// ── Estilo compartido para las celdas de encabezado ──────────
const HEADER_CELL_SX = {
  fontWeight: 600,
  color: '#42648A',
  fontSize: 13,
  borderBottom: '2px solid rgba(28,100,173,0.12)',
};

const PatientsPage = () => {
  // ── Estado de la lista ───────────────────────────────────────
  const [patients, setPatients]   = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchText, setSearchText]  = useState('');

  // ── Estado del diálogo ──────────────────────────────────────
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');

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

  const handleOpenDialog = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return; // evita cerrar mientras guarda
    setDialogOpen(false);
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      // Enviamos solo los campos con valor para no mandar strings vacíos
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '')
      );
      await createPatient(payload);
      setDialogOpen(false);
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

  // ── Render ───────────────────────────────────────────────────
  return (
    <Box>
      {/* Cabecera de sección */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#0C2A4A', fontWeight: 600 }}>
            Pacientes
          </Typography>
          <Typography variant="body2" sx={{ color: '#42648A', mt: 0.3 }}>
            Registro y consulta de pacientes de la clínica
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={handleOpenDialog}
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
              <Search sx={{ color: '#7089A5', fontSize: 20 }} />
            </InputAdornment>
          ),
          sx: { borderRadius: '12px', background: 'rgba(255,255,255,0.7)' },
        }}
      />

      {/* Tabla envuelta en glass sutil */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.6)',
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'rgba(28,100,173,0.04)' }}>
                <TableCell sx={HEADER_CELL_SX}>Nombre completo</TableCell>
                <TableCell sx={HEADER_CELL_SX}>Teléfono</TableCell>
                <TableCell sx={HEADER_CELL_SX}>Ciudad</TableCell>
                <TableCell sx={HEADER_CELL_SX}>Tipo de sangre</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Estado: cargando */}
              {loadingList && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#1C64AD' }} />
                  </TableCell>
                </TableRow>
              )}

              {/* Estado: sin resultados */}
              {!loadingList && patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: '#42648A', fontSize: 14 }}>
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
                  <TableCell sx={{ color: '#0C2A4A', fontWeight: 500 }}>
                    {p.first_name} {p.last_name}
                  </TableCell>
                  <TableCell sx={{ color: '#42648A' }}>{p.phone || '—'}</TableCell>
                  <TableCell sx={{ color: '#42648A' }}>{p.city  || '—'}</TableCell>
                  <TableCell sx={{ color: '#42648A' }}>{p.blood_type || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Diálogo: nuevo paciente ─────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(20,60,110,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#0C2A4A', pb: 1 }}>
          Nuevo paciente
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
            sx={{ borderRadius: '12px', color: '#42648A' }}
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
    </Box>
  );
};

export default PatientsPage;
