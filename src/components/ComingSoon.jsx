// src/components/ComingSoon.jsx
// ============================================================
// Pantalla reutilizable para módulos aún no disponibles.
// Diseño elegante con glass; estático (sin movimiento permanente).
// ============================================================
import { Box, Typography, useTheme } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';

/**
 * @param {string} title - Nombre del módulo (ej: "Facturación")
 * @param {React.ElementType} icon - Ícono de Material UI del módulo
 * @param {string} description - Texto opcional
 */
const ComingSoon = ({ title, icon: Icon = AutoAwesome, description }) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const { glass } = useTheme();

  return (
    <Box sx={{
      minHeight: '70vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', px: 2,
    }}>
      {/* Ícono con brillo de fondo */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        {/* Brillo de fondo */}
        <Box sx={{
          position: 'absolute', inset: 0, margin: 'auto',
          width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.5), transparent 70%)',
          filter: 'blur(20px)',
        }} />
        {/* Tarjeta de vidrio con el ícono */}
        <Box sx={{
          position: 'relative',
          width: 110, height: 110, borderRadius: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...glass.card,
          boxShadow: '0 16px 50px rgba(20,60,110,0.25)',
        }}>
          <Icon sx={{ fontSize: 52, color: '#2563EB' }} />
        </Box>
      </Box>

      {/* Etiqueta "Próximamente" */}
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.7,
        px: 2, py: 0.6, mb: 2, borderRadius: '999px',
        background: isDark ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.10)',
        border: '1px solid rgba(37,99,235,0.30)',
      }}>
        <AutoAwesome sx={{ fontSize: 16, color: '#2563EB' }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
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
