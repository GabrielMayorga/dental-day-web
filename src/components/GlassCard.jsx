// src/components/GlassCard.jsx
// ============================================================
// Tarjeta con efecto "liquid glass" (glassmorphism).
// Componente reutilizable: se usa en login y como acento
// sutil en otras partes de la app.
// ============================================================
import { Box } from '@mui/material';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - Contenido de la tarjeta
 * @param {number} props.blur - Intensidad del desenfoque (default 22)
 * @param {object} props.sx - Estilos adicionales de Material UI
 */
const GlassCard = ({ children, blur = 22, sx = {} }) => {
  return (
    <Box
      sx={{
        // El vidrio: blanco semitransparente + desenfoque del fondo
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: `blur(${blur}px) saturate(170%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(170%)`, // Safari
        border: '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: '22px',
        boxShadow: '0 10px 40px rgba(20, 60, 110, 0.18)',
        padding: { xs: 3, sm: 4 },
        ...sx, // Permite personalizar desde donde se use
      }}
    >
      {children}
    </Box>
  );
};

export default GlassCard;
