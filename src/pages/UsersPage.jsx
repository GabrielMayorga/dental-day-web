// src/pages/UsersPage.jsx
// ============================================================
// Gestión de usuarios del sistema. Solo accesible para admins.
// Permite crear usuarios, cambiar su rol y activar/desactivar.
// Vive dentro del Layout (sidebar + header ya incluidos).
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useColorMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  Box, Typography, Button, Paper, Chip, Switch,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, TextField, Alert, Tooltip, FormControl, InputLabel, Select,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { getUsers, createUser, changeUserRole, changeUserStatus } from '../api/users';

// ── Catálogo de roles ────────────────────────────────────────
const ROLES = [
  { value: 'admin',         label: 'Administrador' },
  { value: 'dentist',       label: 'Odontólogo'    },
  { value: 'receptionist',  label: 'Recepcionista'  },
];

// Color del chip según rol
const ROLE_CHIP_COLOR = {
  admin:        { bg: 'rgba(37,99,235,0.12)',  color: '#2563EB' },
  dentist:      { bg: 'rgba(29,158,117,0.12)', color: '#1D9E75' },
  receptionist: { bg: 'rgba(124,58,237,0.12)', color: '#7C3AED' },
};

// Traduce el valor de BD al label en español
const roleLabel = (value) =>
  ROLES.find((r) => r.value === value)?.label ?? value;

// ── Estado inicial del formulario de creación ────────────────
const EMPTY_FORM = {
  full_name: '',
  email:      '',
  password:   '',
  role:       '',
  first_name: '',
  last_name:  '',
  speciality: '',
  phone:      '',
};

// ── Estilo compartido para encabezados de tabla ──────────────
const TH = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: 13,
  borderBottom: '2px solid rgba(10,31,68,0.10)',
};

// ── Componente principal ─────────────────────────────────────
const UsersPage = () => {
  const { mode } = useColorMode();
  const { user: currentUser } = useAuth();
  const isDark = mode === 'dark';

  // Tokens de estilo glass coherentes con el resto de la app
  const glassBg     = isDark ? 'rgba(22,27,34,0.70)' : 'rgba(255,255,255,0.70)';
  const glassBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)';
  const dialogBg    = isDark ? 'rgba(22,27,34,0.92)' : 'rgba(255,255,255,0.92)';

  // ── Estado de la lista ───────────────────────────────────────
  const [users, setUsers]           = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // ── Estado del diálogo de creación ──────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // ── Estado de acciones en línea (por fila) ───────────────────
  // Rastreamos qué IDs están en proceso para deshabilitar
  // los controles correspondientes mientras se espera la API.
  const [pendingRole,   setPendingRole]   = useState(new Set());
  const [pendingStatus, setPendingStatus] = useState(new Set());

  // ── Carga de usuarios ────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getUsers();
      setUsers(data ?? []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Cambio de rol en línea ───────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    setPendingRole((prev) => new Set(prev).add(userId));
    try {
      await changeUserRole(userId, newRole);
      // Actualiza optimistamente la lista local
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role_name: newRole } : u))
      );
    } catch {
      // Si falla, refresca desde el backend para mantener consistencia
      fetchUsers();
    } finally {
      setPendingRole((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // ── Activar / Desactivar en línea ────────────────────────────
  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    setPendingStatus((prev) => new Set(prev).add(userId));
    try {
      await changeUserStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u))
      );
    } catch {
      fetchUsers();
    } finally {
      setPendingStatus((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // ── Manejo del formulario ────────────────────────────────────
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  // Validación básica antes de enviar
  const isFormValid = () => {
    if (!form.email || !form.password || form.password.length < 8 || !form.role)
      return false;
    if (form.role === 'dentist' && (!form.first_name || !form.last_name))
      return false;
    // Para roles que no son odontólogo, el nombre completo es obligatorio
    if (form.role !== 'dentist' && !form.full_name)
      return false;
    return true;
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      // Arma el payload según el rol seleccionado
      // Arma el payload según el rol seleccionado
      const payload = { email: form.email, password: form.password, role: form.role };
      if (form.role === 'dentist') {
        payload.first_name = form.first_name;
        payload.last_name  = form.last_name;
        payload.full_name  = `${form.first_name} ${form.last_name}`.trim();
        if (form.speciality) payload.speciality = form.speciality;
        if (form.phone)      payload.phone       = form.phone;
      } else {
        payload.full_name = form.full_name;
      }
      await createUser(payload);
      setDialogOpen(false);
      fetchUsers(); // refresca la lista
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error al crear el usuario'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <Box>
      {/* Cabecera: título + botón de acción */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Usuarios
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Gestión de cuentas y roles del sistema
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={handleOpenCreate}
          sx={{
            borderRadius: '12px',
            px: 2.5,
            background: '#2563EB',
            '&:hover': { background: '#1D4ED8' },
          }}
        >
          Nuevo usuario
        </Button>
      </Box>

      {/* Tabla envuelta en glass card */}
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
                <TableCell sx={TH}>Correo</TableCell>
                <TableCell sx={TH}>Rol</TableCell>
                <TableCell sx={TH}>Nombre</TableCell>
                <TableCell sx={TH}>Estado</TableCell>
                <TableCell sx={{ ...TH, width: 220, textAlign: 'center' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Cargando */}
              {loadingList && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#2563EB' }} />
                  </TableCell>
                </TableRow>
              )}

              {/* Sin usuarios */}
              {!loadingList && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: 14 }}>
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              )}

              {/* Filas */}
              {!loadingList && users.map((u) => {
                const isSelf        = u.id === currentUser?.id;
                const roleColors    = ROLE_CHIP_COLOR[u.role_name] ?? { bg: 'rgba(0,0,0,0.08)', color: 'text.secondary' };
                const roleChanging  = pendingRole.has(u.id);
                const statusChanging = pendingStatus.has(u.id);
                const fullName      = u.full_name || '--';

                return (
                  <TableRow
                    key={u.id}
                    hover
                    sx={{ '&:last-child td': { border: 0 } }}
                  >
                    {/* Correo */}
                    <TableCell sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {u.email}
                    </TableCell>

                    {/* Chip de rol */}
                    <TableCell>
                      <Chip
                        label={roleLabel(u.role_name)}
                        size="small"
                        sx={{
                          background: roleColors.bg,
                          color: roleColors.color,
                          fontWeight: 600,
                          fontSize: 12,
                          border: 'none',
                        }}
                      />
                    </TableCell>

                    {/* Nombre (solo odontólogos lo tienen) */}
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {fullName}
                    </TableCell>

                    {/* Chip de estado */}
                    <TableCell>
                      <Chip
                        label={u.is_active ? 'Activo' : 'Inactivo'}
                        size="small"
                        sx={{
                          background: u.is_active
                            ? 'rgba(29,158,117,0.12)'
                            : 'rgba(0,0,0,0.07)',
                          color: u.is_active ? '#1D9E75' : 'text.secondary',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      />
                    </TableCell>

                    {/* Acciones: select de rol + toggle de estado */}
                    <TableCell sx={{ py: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        {/* Selector de rol */}
                        <FormControl size="small" sx={{ minWidth: 140 }} disabled={roleChanging}>
                          <Select
                            value={u.role_name}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            sx={{
                              fontSize: 13,
                              borderRadius: '10px',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(10,31,68,0.15)',
                              },
                            }}
                          >
                            {ROLES.map((r) => (
                              <MenuItem key={r.value} value={r.value} sx={{ fontSize: 13 }}>
                                {r.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Toggle activo/inactivo */}
                        <Tooltip
                          title={
                            isSelf
                              ? 'No puedes desactivar tu propia cuenta'
                              : u.is_active
                                ? 'Desactivar usuario'
                                : 'Activar usuario'
                          }
                        >
                          {/* Box necesario para que Tooltip funcione con elemento disabled */}
                          <Box component="span">
                            <Switch
                              checked={!!u.is_active}
                              disabled={isSelf || statusChanging}
                              onChange={() => handleStatusToggle(u.id, u.is_active)}
                              size="small"
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#2563EB' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: '#2563EB',
                                },
                              }}
                            />
                          </Box>
                        </Tooltip>

                        {/* Spinner durante cambio de estado */}
                        {statusChanging && (
                          <CircularProgress size={16} sx={{ color: '#2563EB' }} />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Diálogo: crear usuario ──────────────────────────────── */}
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
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.45)'
              : '0 20px 60px rgba(20,60,110,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'text.primary', pb: 1 }}>
          Nuevo usuario
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Error del backend (ej: email duplicado 409) */}
          {formError && (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>
              {formError}
            </Alert>
          )}

          {/* Correo y contraseña */}
          <TextField
            label="Correo electrónico *"
            name="email"
            type="email"
            value={form.email}
            onChange={handleFieldChange}
            fullWidth
            size="small"
          />
          <TextField
            label="Contraseña * (mínimo 8 caracteres)"
            name="password"
            type="password"
            value={form.password}
            onChange={handleFieldChange}
            fullWidth
            size="small"
            error={form.password.length > 0 && form.password.length < 8}
            helperText={
              form.password.length > 0 && form.password.length < 8
                ? 'La contraseña debe tener al menos 8 caracteres'
                : ''
            }
          />

          

          {/* Rol */}
          <TextField
            select
            label="Rol *"
            name="role"
            value={form.role}
            onChange={handleFieldChange}
            fullWidth
            size="small"
          >
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Nombre completo: para admin y recepcionista */}
          {form.role && form.role !== 'dentist' && (
            <TextField
              label="Nombre completo *"
              name="full_name"
              value={form.full_name}
              onChange={handleFieldChange}
              required
              fullWidth
              size="small"
            />
          )}

          {/* Campos adicionales SOLO para odontólogos */}
          {form.role === 'dentist' && (
            <>
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
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Especialidad"
                  name="speciality"
                  value={form.speciality}
                  onChange={handleFieldChange}
                  fullWidth
                  size="small"
                  placeholder="Ortodoncia, Endodoncia…"
                />
                <TextField
                  label="Teléfono"
                  name="phone"
                  value={form.phone}
                  onChange={handleFieldChange}
                  fullWidth
                  size="small"
                />
              </Box>
            </>
          )}
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
            disabled={saving || !isFormValid()}
            sx={{
              borderRadius: '12px',
              minWidth: 110,
              background: '#2563EB',
              '&:hover': { background: '#1D4ED8' },
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Crear usuario'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
