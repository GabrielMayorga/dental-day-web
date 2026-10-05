// src/pages/LoginPage.jsx
// ============================================================
// Pantalla de acceso.
// - Escritorio: dos columnas. Izquierda: logo, lema y contacto de
//   la clínica sobre el fondo de marca. Derecha: formulario.
// - Móvil: una columna. Formulario primero y debajo un bloque
//   compacto de contacto; la columna izquierda no se renderiza
//   (competiría con la única acción posible de la pantalla).
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, InputAdornment,
  Link, Fade, Grow, useMediaQuery, useTheme,
} from '@mui/material';
import { Email, Lock, Place, LocationCity, Phone, WhatsApp } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';
import DentalDayMark from '../components/DentalDayMark';
import { CLINICA } from '../config/clinica';
import { duration, easing } from '../theme/motion';
import useReducedMotion from '../hooks/useReducedMotion';

// Desfase entre la entrada del formulario y la de la columna de marca
const DESFASE_MS = 120;

const ARIA_TELEFONO = `Llamar a ${CLINICA.nombre} al ${CLINICA.telefono.visible}`;
const ARIA_WHATSAPP = `Escribir por WhatsApp a ${CLINICA.nombre} al ${CLINICA.whatsapp.visible} (se abre en una pestaña nueva)`;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const reduced = useReducedMotion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Entradas: formulario con Grow; marca con Fade, DESFASE_MS después
  const entrada = (delay = 0) => ({
    in: true,
    appear: !reduced,
    timeout: reduced ? 0 : duration.slow,
    easing: easing.enter,
    style: { transitionDelay: `${reduced ? 0 : delay}ms` },
  });

  // ── Formulario (lógica sin cambios) ─────────────────────────
  const formulario = (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: { xs: 2, sm: 3 } }}>
        <Box sx={{ color: 'text.primary', display: 'flex', mb: 1.5 }}>
          <DentalDayMark size={56} />
        </Box>
        <Typography
          variant="h6"
          component="h1"
          sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
        >
          {CLINICA.nombre}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: 13, sm: 14 } }}>
          Inicia sesión para continuar
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth label="Correo" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} required margin="normal"
          slotProps={{ input: { startAdornment: (<InputAdornment position="start"><Email sx={{ color: 'text.secondary' }} /></InputAdornment>) } }}
        />
        <TextField
          fullWidth label="Contraseña" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} required margin="normal"
          slotProps={{ input: { startAdornment: (<InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>) } }}
        />
        <Button
          type="submit" fullWidth variant="contained" disabled={loading}
          sx={{ mt: 3, py: 1.3, fontSize: '15px' }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar sesión'}
        </Button>
      </form>

      {/* Ayuda discreta para quien no pueda acceder */}
      <Typography sx={{ textAlign: 'center', mt: 2, fontSize: 13, color: 'text.secondary' }}>
        ¿Problemas para acceder? Llama al{' '}
        <Link href={CLINICA.telefono.href} aria-label={ARIA_TELEFONO} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {CLINICA.telefono.visible}
        </Link>
      </Typography>
    </Box>
  );

  // ── Fila de contacto con ícono ──────────────────────────────
  const contacto = (Icon, contenido) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Icon sx={{ fontSize: 20, color: 'text.secondary' }} aria-hidden />
      <Typography component="span" sx={{ fontSize: 15, color: 'text.primary' }}>{contenido}</Typography>
    </Box>
  );

  const enlaceTelefono = (
    <Link href={CLINICA.telefono.href} aria-label={ARIA_TELEFONO} underline="hover" color="inherit">
      {CLINICA.telefono.visible}
    </Link>
  );

  const enlaceWhatsApp = (texto) => (
    <Link
      href={CLINICA.whatsapp.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ARIA_WHATSAPP}
      underline="hover"
      color="inherit"
    >
      {texto}
    </Link>
  );

  // ── Móvil: formulario + bloque compacto de contacto ─────────
  if (isMobile) {
    return (
      <AnimatedBackground>
        <ThemeToggle floating />
        <Box sx={{ width: 'calc(100% - 48px)', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grow {...entrada(0)}>
            <Box>
              <GlassCard>{formulario}</GlassCard>
            </Box>
          </Grow>
          <Fade {...entrada(DESFASE_MS)}>
            <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', columnGap: 3, rowGap: 1 }}>
              {contacto(Phone, enlaceTelefono)}
              {contacto(WhatsApp, enlaceWhatsApp('WhatsApp'))}
            </Box>
          </Fade>
        </Box>
      </AnimatedBackground>
    );
  }

  // ── Escritorio: dos columnas ────────────────────────────────
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100dvh' }}>
      {/* IZQUIERDA: marca y contacto */}
      <AnimatedBackground>
        <Fade {...entrada(DESFASE_MS)}>
          <Box sx={{ width: '100%', maxWidth: 420, px: 4 }}>
            {/* El logo tiene texto marino y gris: siempre sobre superficie clara */}
            <Box sx={{ backgroundColor: '#FFFFFF', borderRadius: '14px', px: 4, py: 3, mb: 3 }}>
              <Box
                component="img"
                src="/logo-full.png"
                alt={CLINICA.nombre}
                sx={{ width: '100%', maxWidth: 300, height: 'auto', display: 'block', mx: 'auto' }}
              />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'text.primary', mb: 3 }}>
              {CLINICA.lema}
            </Typography>
            <Box component="address" sx={{ fontStyle: 'normal', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {contacto(Place, CLINICA.direccion)}
              {contacto(LocationCity, CLINICA.ciudad)}
              {contacto(Phone, enlaceTelefono)}
              {contacto(WhatsApp, enlaceWhatsApp(CLINICA.whatsapp.visible))}
            </Box>
          </Box>
        </Fade>
      </AnimatedBackground>

      {/* DERECHA: formulario */}
      <Box sx={{
        bgcolor: 'background.default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', px: 4,
      }}>
        <ThemeToggle floating />
        <Grow {...entrada(0)}>
          <Box sx={{ width: '100%', maxWidth: 380 }}>
            {formulario}
          </Box>
        </Grow>
      </Box>
    </Box>
  );
};

export default LoginPage;
