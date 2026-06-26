// src/components/GlassCard.jsx
// ============================================================
// Tarjeta "liquid glass" que se adapta a modo claro/oscuro.
// Más blur y sombra flotante independiente (estilo moderno).
// ============================================================
import { Box } from '@mui/material';
import { useColorMode } from '../context/ThemeContext';

const GlassCard = ({ children, blur = 26, sx = {} }) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        // Vidrio: claro = blanco translúcido; oscuro = oscuro translúcido
        background: isDark
          ? 'rgba(20, 28, 46, 0.55)'
          : 'rgba(255, 255, 255, 0.45)',
        backdropFilter: `blur(${blur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
        border: isDark
          ? '1px solid rgba(255, 255, 255, 0.10)'
          : '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: '22px',
        // Sombra flotante "independiente" (más difusa y profunda)
        boxShadow: isDark
          ? '0 16px 50px rgba(0, 0, 0, 0.45)'
          : '0 16px 50px rgba(20, 60, 110, 0.18)',
        padding: { xs: 3, sm: 4 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default GlassCard;
