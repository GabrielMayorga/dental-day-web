// src/components/AnimatedBackground.jsx
// ============================================================
// Fondo con manchas de color difuminadas, adaptado a modo
// claro/oscuro. Las manchas son estáticas: el sistema no usa
// movimiento permanente (ver src/theme/motion.js).
// ============================================================
import { Box } from '@mui/material';
import { useColorMode } from '../context/ThemeContext';

const AnimatedBackground = ({ children }) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  // Gradiente del fondo según el modo
  const bgGradient = isDark
    ? 'linear-gradient(135deg, #090D14 0%, #0D1117 50%, #090D14 100%)'
    : 'linear-gradient(135deg, #EDF1FA 0%, #F4F6FA 50%, #EAF0F9 100%)';

  // Colores de las manchas según el modo
  const blobs = isDark
    ? ['#1A1070', '#2563EB', '#0E5A47']   // morados/azul Plandok/verde profundos
    : ['#7FB8E8', '#6FD3B8', '#9AA9F0'];

  return (
    <Box sx={{
      // 100dvh (altura dinámica del viewport) evita que la barra de
      // direcciones del navegador móvil corte el contenido
      minHeight: '100dvh', position: 'relative', overflow: 'hidden',
      background: bgGradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      // Aire vertical en móvil para que la tarjeta no quede pegada a
      // los bordes cuando el contenido es más alto que la pantalla
      py: { xs: 4, sm: 0 },
    }}>
      <Box sx={{
        position: 'absolute', width: 320, height: 320, borderRadius: '50%',
        top: '-80px', left: '-60px', background: blobs[0],
        filter: 'blur(70px)', opacity: isDark ? 0.5 : 0.55,
      }} />
      <Box sx={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        bottom: '-70px', right: '-50px', background: blobs[1],
        filter: 'blur(70px)', opacity: isDark ? 0.45 : 0.5,
      }} />
      <Box sx={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%',
        bottom: '60px', left: '30%', background: blobs[2],
        filter: 'blur(80px)', opacity: isDark ? 0.4 : 0.4,
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        {children}
      </Box>
    </Box>
  );
};

export default AnimatedBackground;
