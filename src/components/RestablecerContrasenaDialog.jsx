// src/components/RestablecerContrasenaDialog.jsx
// ============================================================
// Restablecimiento de contraseña por el admin, en dos pasos:
//   1. Confirmación (qué va a pasar con el usuario).
//   2. La contraseña temporal que generó el servidor, UNA vez.
// La temporal solo vive en el estado de este componente y se
// borra al terminar de cerrar el diálogo. Mientras se muestra,
// el diálogo no se cierra con un clic afuera ni con Escape:
// perderla por accidente obliga a restablecer de nuevo.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Alert, CircularProgress,
} from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';
import { resetUserPassword } from '../api/users';

// Cuánto se muestra "Copiada" antes de volver a "Copiar"
const COPIADO_MS = 2000;

/**
 * @param {object|null} user    - Usuario a restablecer; null = cerrado
 * @param {function}    onClose
 */
const RestablecerContrasenaDialog = ({ user, onClose }) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [temporal, setTemporal] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState(false);
  const copiadoTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiadoTimer.current), []);

  const nombre = user?.full_name || user?.email;

  const handleClose = (_event, reason) => {
    if (saving) return;
    // Con la temporal en pantalla solo se cierra con el botón
    if (temporal && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    onClose();
  };

  // Al terminar la animación de salida: borrar TODO, en especial la temporal
  const handleExited = () => {
    clearTimeout(copiadoTimer.current);
    setTemporal('');
    setError('');
    setCopiado(false);
    setErrorCopia(false);
  };

  const handleConfirm = async () => {
    setError('');
    setSaving(true);
    try {
      const { temporary_password } = await resetUserPassword(user.id);
      setTemporal(temporary_password);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporal);
      setErrorCopia(false);
      setCopiado(true);
      clearTimeout(copiadoTimer.current);
      copiadoTimer.current = setTimeout(() => setCopiado(false), COPIADO_MS);
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS): que la copie a mano
      setErrorCopia(true);
    }
  };

  return (
    <Dialog
      open={Boolean(user)}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="restablecer-titulo"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            background: isDark ? 'rgba(22,27,34,0.92)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.45)'
              : '0 20px 60px rgba(20,60,110,0.15)',
          },
        },
        transition: { onExited: handleExited },
      }}
    >
      <DialogTitle id="restablecer-titulo" sx={{ fontWeight: 600, color: 'text.primary', pb: 0.5 }}>
        {temporal ? 'Contraseña temporal' : '¿Restablecer contraseña?'}
      </DialogTitle>

      {!temporal ? (
        <>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: '12px' }}>{error}</Alert>}
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Se generará una contraseña temporal para <strong>{nombre}</strong>. Sus
              sesiones abiertas se cerrarán y deberá crear una nueva al ingresar.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose} disabled={saving} sx={{ borderRadius: '12px', color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={saving}
              sx={{
                borderRadius: '12px',
                minWidth: 130,
                background: '#2563EB',
                '&:hover': { background: '#1D4ED8' },
              }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Restablecer'}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
              Contraseña temporal de <strong>{nombre}</strong>:
            </Typography>

            <Box
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                px: 2, py: 2.5, borderRadius: '12px',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,31,68,0.05)',
                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(10,31,68,0.10)',
              }}
            >
              <Typography
                component="code"
                aria-label="Contraseña temporal"
                sx={{
                  fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
                  fontSize: { xs: 24, sm: 28 },
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'text.primary',
                  userSelect: 'all',
                  wordBreak: 'break-all',
                  textAlign: 'center',
                }}
              >
                {temporal}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
              <Button
                onClick={handleCopy}
                startIcon={copiado ? <Check /> : <ContentCopy />}
                sx={{ borderRadius: '12px' }}
              >
                {copiado ? 'Copiada' : 'Copiar'}
              </Button>
            </Box>
            {/* Anuncia la copia a lectores de pantalla */}
            <Box component="span" role="status" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              {copiado ? 'Contraseña copiada al portapapeles' : ''}
            </Box>

            {errorCopia && (
              <Alert severity="error" sx={{ mt: 1.5, borderRadius: '12px' }}>
                No se pudo copiar. Selecciónala y cópiala a mano.
              </Alert>
            )}

            <Alert severity="warning" sx={{ mt: 2, borderRadius: '12px' }}>
              Entrégala en persona. No se volverá a mostrar.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              variant="contained"
              onClick={() => onClose()}
              sx={{
                borderRadius: '12px',
                minWidth: 110,
                background: '#2563EB',
                '&:hover': { background: '#1D4ED8' },
              }}
            >
              Listo
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default RestablecerContrasenaDialog;
