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
  MenuItem, TextField, Alert, Tooltip, FormControl, Select,
  Snackbar, useTheme, useMediaQuery,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { getUsers, createUser, changeUserRole, changeUserStatus } from '../api/users';
import AnimatedList from '../components/AnimatedList';
import { CardListSkeleton, TableRowsSkeleton } from '../components/Skeletons';

// ── Catálogo de roles ────────────────────────────────────────
const ROLES = [
  { value: 'admin',         label: 'Administrador' },
  { value: 'dentist',       label: 'Odontólogo'    },
  { value: 'receptionist',  label: 'Recepcionista'  },
];

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

  // Niveles de vidrio centralizados en el tema (theme.glass)
  const { glass } = useTheme();

  // Detección de móvil para alternar entre la tabla y las tarjetas
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ── Estado de la lista ───────────────────────────────────────
  const [users, setUsers]           = useState([]);
  const [loadingList, setLoadingList] = useState(true);   // solo primera carga
  const [refreshing, setRefreshing]   = useState(false);  // recargas tras acciones

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

  // ── Confirmación de cambio de rol ───────────────────────────
  // roleConfirm = { user, newRole } mientras hay un cambio pendiente de confirmar
  const [roleConfirm, setRoleConfirm] = useState(null);
  const [roleSaving,  setRoleSaving]  = useState(false);

  // ── Snackbar de errores del backend ─────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const closeSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  // ── Carga de usuarios ────────────────────────────────────────
  // El skeleton solo cubre la primera carga; las recargas (tras crear
  // o cambiar estado) atenúan la lista sin desmontarla, para que las
  // filas no vuelvan a animar su entrada.
  const fetchUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getUsers();
      setUsers(data ?? []);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Cambio de rol: paso 1, pedir confirmación ───────────────
  const handleRoleSelect = (u, newRole) => {
    if (newRole === u.role_name) return; // no hay cambio
    setRoleConfirm({ user: u, newRole });
  };

  const handleCancelRoleChange = () => {
    if (roleSaving) return; // no cerrar mientras se aplica
    setRoleConfirm(null);
  };

  // ── Cambio de rol: paso 2, aplicar tras confirmar ──────────
  const handleConfirmRoleChange = async () => {
    if (!roleConfirm) return;
    const { user: u, newRole } = roleConfirm;
    setRoleSaving(true);
    setPendingRole((prev) => new Set(prev).add(u.id));
    try {
      await changeUserRole(u.id, newRole);
      // Actualiza la lista local sin recargar todo (igual que handleStatusToggle)
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, role_name: newRole } : x))
      );
      setRoleConfirm(null);
    } catch (err) {
      setSnackbar({
        open: true,
        message:
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Error al cambiar el rol',
      });
      setRoleConfirm(null);
    } finally {
      setRoleSaving(false);
      setPendingRole((prev) => {
        const next = new Set(prev);
        next.delete(u.id);
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

  // ── Control de rol reutilizable (tabla y tarjetas) ──────────
  const renderRoleControl = (u) => {
    const isSelf       = u.id === currentUser?.id;
    const roleChanging = pendingRole.has(u.id);

    const select = (
      <FormControl size="small" sx={{ minWidth: 150 }} disabled={isSelf || roleChanging}>
        <Select
          value={u.role_name}
          onChange={(e) => handleRoleSelect(u, e.target.value)}
          sx={{
            fontSize: 13,
            borderRadius: '10px',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(10,31,68,0.15)' },
          }}
        >
          {ROLES.map((r) => (
            <MenuItem key={r.value} value={r.value} sx={{ fontSize: 13 }}>
              {r.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isSelf ? (
          <Tooltip title="No puedes cambiar tu propio rol">
            {/* span necesario para que el Tooltip funcione sobre un control deshabilitado */}
            <Box component="span">{select}</Box>
          </Tooltip>
        ) : (
          select
        )}
        {roleChanging && <CircularProgress size={16} sx={{ color: '#2563EB' }} />}
      </Box>
    );
  };

  // ── Interruptor de estado reutilizable (tabla y tarjetas) ───
  const renderStatusControl = (u) => {
    const isSelf         = u.id === currentUser?.id;
    const statusChanging = pendingStatus.has(u.id);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        {statusChanging && <CircularProgress size={16} sx={{ color: '#2563EB' }} />}
      </Box>
    );
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

      {isMobile ? (
        // ── Lista de tarjetas (móvil): reemplaza la tabla ──────
        loadingList ? (
          <CardListSkeleton count={4} lines={3} paperSx={glass.dense} />
        ) : (
        <AnimatedList refreshing={refreshing} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>

          {!loadingList && users.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary', fontSize: 14 }}>
              No hay usuarios registrados
            </Box>
          )}

          {!loadingList && users.map((u) => (
            <Paper
              key={u.id}
              elevation={0}
              sx={{
                borderRadius: '14px',
                ...glass.dense,
                p: 1.75,
              }}
            >
              {/* Correo + estado */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: 15, wordBreak: 'break-word' }}>
                    {u.email}
                  </Typography>
                  {u.full_name && (
                    <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.25 }}>
                      {u.full_name}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={u.is_active ? 'Activo' : 'Inactivo'}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    background: u.is_active ? 'rgba(29,158,117,0.12)' : 'rgba(0,0,0,0.07)',
                    color: u.is_active ? '#1D9E75' : 'text.secondary',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                />
              </Box>

              {/* Rol + interruptor de estado */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  rowGap: 1,
                  mt: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Rol</Typography>
                  {renderRoleControl(u)}
                </Box>
                {renderStatusControl(u)}
              </Box>
            </Paper>
          ))}
        </AnimatedList>
        )
      ) : (
      // ── Tabla envuelta en glass card (escritorio) ──────────
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          ...glass.dense,
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

            {/* Cargando */}
            {loadingList ? (
              <TableBody>
                <TableRowsSkeleton rows={5} cols={4} actions={2} />
              </TableBody>
            ) : (
            <AnimatedList component={TableBody} refreshing={refreshing}>

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
                const fullName = u.full_name || '--';

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

                    {/* Selector de rol */}
                    <TableCell>
                      {renderRoleControl(u)}
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

                    {/* Acciones: interruptor de estado */}
                    <TableCell sx={{ py: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        {renderStatusControl(u)}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </AnimatedList>
            )}
          </Table>
        </TableContainer>
      </Paper>
      )}

      {/* ── Diálogo: confirmar cambio de rol ────────────────────── */}
      <Dialog
        open={Boolean(roleConfirm)}
        onClose={handleCancelRoleChange}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.45)'
              : '0 20px 60px rgba(20,60,110,0.15)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'text.primary', pb: 0.5 }}>
          ¿Cambiar rol de usuario?
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            ¿Cambiar el rol de{' '}
            <strong>{roleConfirm?.user.full_name || roleConfirm?.user.email}</strong>{' '}
            de <strong>{roleLabel(roleConfirm?.user.role_name)}</strong> a{' '}
            <strong>{roleLabel(roleConfirm?.newRole)}</strong>? Esto modifica de
            inmediato a qué partes del sistema puede acceder.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCancelRoleChange}
            disabled={roleSaving}
            sx={{ borderRadius: '12px', color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmRoleChange}
            disabled={roleSaving}
            sx={{
              borderRadius: '12px',
              minWidth: 110,
              background: '#2563EB',
              '&:hover': { background: '#1D4ED8' },
            }}
          >
            {roleSaving ? <CircularProgress size={20} color="inherit" /> : 'Cambiar rol'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: crear usuario ──────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '20px',
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

      {/* ── Snackbar: errores del backend ───────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={closeSnackbar}
          sx={{ borderRadius: '12px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersPage;
