// src/components/ForbiddenNotice.jsx
// ============================================================
// Aviso global cuando el backend responde 403 (acceso denegado).
// Muestra el mensaje del servidor tal cual: él decide qué se
// puede hacer y explica por qué no.
// ============================================================
import { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { onForbidden } from '../api/client';

const ForbiddenNotice = () => {
  const [aviso, setAviso] = useState({ open: false, message: '' });

  useEffect(() => onForbidden((message) => setAviso({ open: true, message })), []);

  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setAviso((a) => ({ ...a, open: false }));
  };

  return (
    <Snackbar
      open={aviso.open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="error" variant="filled" onClose={handleClose} sx={{ borderRadius: '12px' }}>
        {aviso.message}
      </Alert>
    </Snackbar>
  );
};

export default ForbiddenNotice;
