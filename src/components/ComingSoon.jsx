// src/components/ComingSoon.jsx
// ============================================================
// Pantalla reutilizable para módulos aún no disponibles.
// Diseño elegante con glass y una animación sutil.
// ============================================================
import { Box, Typography, keyframes } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';

// El ícono "respira" suavemente (escala + opacidad)
const breathe = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50%      { transform: scale(1.08); opacity: 1; }
`;

// Un brillo que pulsa detrás del ícono
const glow = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(1.2); }
`;

/**
 * @param {string} title - Nombre del módulo (ej: "Facturación")
 * @param {React.ElementType} icon - Ícono de Material UI del módulo
 * @param {string} description - Texto opcional
 */
const ComingSoon = ({ title, icon: Icon = AutoAwesome, description }) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  return (
    <Box sx={{
      minHeight: '70vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', px: 2,
    }}>
      {/* Ícono con brillo animado */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        {/* Brillo de fondo */}
        <Box sx={{
          position: 'absolute', inset: 0, margin: 'auto',
          width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(43,127,212,0.5), transparent 70%)',
          filter: 'blur(20px)',
          animation: `${glow} 4s ease-in-out infinite`,
        }} />
        {/* Tarjeta de vidrio con el ícono */}
        <Box sx={{
          position: 'relative',
          width: 110, height: 110, borderRadius: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isDark ? 'rgba(20,28,46,0.6)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 16px 50px rgba(20,60,110,0.25)',
          animation: `${breathe} 4s ease-in-out infinite`,
        }}>
          <Icon sx={{ fontSize: 52, color: '#2B7FD4' }} />
        </Box>
      </Box>

      {/* Etiqueta "Próximamente" */}
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.7,
        px: 2, py: 0.6, mb: 2, borderRadius: '999px',
        background: isDark ? 'rgba(43,127,212,0.18)' : 'rgba(43,127,212,0.10)',
        border: '1px solid rgba(43,127,212,0.3)',
      }}>
        <AutoAwesome sx={{ fontSize: 16, color: '#2B7FD4' }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#2B7FD4' }}>
          Próximamente
        </Typography>
      </Box>

      <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 420 }}>
        {description || 'Este módulo está en desarrollo y estará disponible muy pronto. Estamos trabajando para traértelo.'}
      </Typography>
    </Box>
  );
};

export default ComingSoon;
