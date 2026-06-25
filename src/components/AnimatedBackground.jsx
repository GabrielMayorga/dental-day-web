// src/components/AnimatedBackground.jsx
// ============================================================
// Fondo con manchas de color difuminadas que se mueven lento.
// Da el ambiente "liquid" detrás del vidrio. CSS puro, ligero.
// ============================================================
import { Box, keyframes } from '@mui/material';

// Animaciones de movimiento sutil (CSS keyframes)
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
  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #DCEBFB 0%, #E8F5F0 45%, #DDE9FA 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Mancha 1 */}
      <Box sx={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        top: '-80px', left: '-60px', background: '#7FB8E8',
        filter: 'blur(60px)', opacity: 0.55,
        animation: `${drift1} 20s ease-in-out infinite`,
      }} />
      {/* Mancha 2 */}
      <Box sx={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        bottom: '-70px', right: '-50px', background: '#6FD3B8',
        filter: 'blur(60px)', opacity: 0.5,
        animation: `${drift2} 24s ease-in-out infinite`,
      }} />
      {/* Mancha 3 */}
      <Box sx={{
        position: 'absolute', width: 240, height: 240, borderRadius: '50%',
        bottom: '60px', left: '30%', background: '#9AA9F0',
        filter: 'blur(70px)', opacity: 0.4,
        animation: `${drift3} 28s ease-in-out infinite`,
      }} />

      {/* El contenido (la tarjeta de login) va encima */}
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        {children}
      </Box>
    </Box>
  );
};

export default AnimatedBackground;
