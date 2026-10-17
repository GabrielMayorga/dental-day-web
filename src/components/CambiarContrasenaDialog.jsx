// src/components/CambiarContrasenaDialog.jsx
// ============================================================
// Cambio voluntario de contraseña, desde el menú del perfil.
// El contenido se desmonta al cerrar: cada apertura empieza con
// el formulario vacío.
// ============================================================
import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import { useColorMode } from '../context/ThemeContext';
import FormularioContrasena from './FormularioContrasena';

const CambiarContrasenaDialog = ({ open, onClose, onSuccess }) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const [busy, setBusy] = useState(false);

  // Mientras se guarda no se cierra: la respuesta trae los tokens nuevos
  const handleClose = () => {
    if (!busy) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="cambiar-contrasena-titulo"
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
      }}
    >
      <DialogTitle id="cambiar-contrasena-titulo" sx={{ fontWeight: 600, color: 'text.primary', pb: 0 }}>
        Cambiar contraseña
      </DialogTitle>
      <DialogContent>
        <FormularioContrasena
          autoFocus
          onCancel={handleClose}
          onBusyChange={setBusy}
          // Mismo azul que los botones principales de las páginas internas
          submitSx={{ background: '#2563EB', '&:hover': { background: '#1D4ED8' } }}
          onSuccess={() => {
            setBusy(false);
            onSuccess();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CambiarContrasenaDialog;
