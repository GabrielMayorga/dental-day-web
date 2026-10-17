// src/pages/CrearContrasenaPage.jsx
// ============================================================
// Cambio de contraseña OBLIGATORIO, tras un restablecimiento del
// administrador. Pantalla sin navegación: la única salida es
// cerrar sesión. El servidor también lo exige (403
// PASSWORD_CHANGE_REQUIRED en cualquier otra ruta).
// ============================================================
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grow } from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';
import DentalDayMark from '../components/DentalDayMark';
import FormularioContrasena from '../components/FormularioContrasena';
import { duration, easing } from '../theme/motion';
import useReducedMotion from '../hooks/useReducedMotion';

const CrearContrasenaPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AnimatedBackground>
      <ThemeToggle floating />
      <Grow
        in
        appear={!reduced}
        timeout={reduced ? 0 : duration.slow}
        easing={easing.enter}
      >
        <Box sx={{ width: 'calc(100% - 32px)', maxWidth: 420 }}>
          <GlassCard>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Box sx={{ color: 'text.primary', display: 'flex', mb: 1.5 }}>
                <DentalDayMark size={56} />
              </Box>
              <Typography
                variant="h6"
                component="h1"
                sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.15rem', sm: '1.3rem' } }}
              >
                Crea tu contraseña
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, fontSize: { xs: 13, sm: 14 } }}>
                Ingresaste con una contraseña temporal. Para continuar, crea una
                nueva que solo tú conozcas.
              </Typography>
            </Box>

            <FormularioContrasena
              autoFocus
              currentLabel="Contraseña temporal"
              submitLabel="Crear contraseña"
              onSuccess={() => navigate('/', { replace: true })}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                onClick={handleLogout}
                startIcon={<Logout fontSize="small" />}
                sx={{ borderRadius: '12px', color: 'text.secondary' }}
              >
                Cerrar sesión
              </Button>
            </Box>
          </GlassCard>
        </Box>
      </Grow>
    </AnimatedBackground>
  );
};

export default CrearContrasenaPage;
