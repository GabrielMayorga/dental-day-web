// src/components/RateLimitNotice.jsx
// ============================================================
// Aviso global cuando el backend responde 429 (demasiadas
// peticiones). Escucha al cliente HTTP (onRateLimited), que ya se
// encarga de avisar una sola vez por cada periodo de límite.
// ============================================================
import { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { onRateLimited } from '../api/client';

const RateLimitNotice = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => onRateLimited(() => setOpen(true)), []);

  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="warning" variant="filled" onClose={handleClose} sx={{ borderRadius: '12px' }}>
        El sistema está recibiendo muchas solicitudes. Espera un momento.
      </Alert>
    </Snackbar>
  );
};

export default RateLimitNotice;
