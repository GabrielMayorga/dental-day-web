// src/components/AnimatedBackground.jsx
// ============================================================
// Fondo con manchas de color en movimiento, adaptado a
// modo claro/oscuro (como portfolios modernos).
// ============================================================
import { Box, keyframes } from '@mui/material';
import { useColorMode } from '../context/ThemeContext';

const drift1 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(40px, -30px) scale(1.12); }
`;
const drift2 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-35px, 25px) scale(1.1); }
`;
const drift3 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(25px, 30px) scale(1.08); }
`;

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
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: bgGradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Box sx={{
        position: 'absolute', width: 320, height: 320, borderRadius: '50%',
        top: '-80px', left: '-60px', background: blobs[0],
        filter: 'blur(70px)', opacity: isDark ? 0.5 : 0.55,
        animation: `${drift1} 20s ease-in-out infinite`,
      }} />
      <Box sx={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        bottom: '-70px', right: '-50px', background: blobs[1],
        filter: 'blur(70px)', opacity: isDark ? 0.45 : 0.5,
        animation: `${drift2} 24s ease-in-out infinite`,
      }} />
      <Box sx={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%',
        bottom: '60px', left: '30%', background: blobs[2],
        filter: 'blur(80px)', opacity: isDark ? 0.4 : 0.4,
        animation: `${drift3} 28s ease-in-out infinite`,
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        {children}
      </Box>
    </Box>
  );
};

export default AnimatedBackground;
