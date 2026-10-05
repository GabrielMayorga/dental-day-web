// src/components/ThemeToggle.jsx
// ============================================================
// Botón para alternar entre modo claro y oscuro (sol/luna).
// Estilo flotante con glass, como en portfolios modernos.
// ============================================================
import { useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';
import { useThemeTransition } from '../theme/useThemeTransition';
import { duration, easing } from '../theme/motion';
import { REDUCED_MOTION_QUERY } from '../hooks/useReducedMotion';

// El ícono entrante gira 180° y aparece mientras los colores se funden.
// Es una animación (no una transition) porque durante el cambio de tema
// la regla `.cambiando-tema *` reemplaza las transiciones con !important.
const giro = keyframes`
  from { transform: rotate(-180deg); opacity: 0; }
  to   { transform: rotate(0deg);    opacity: 1; }
`;

const ThemeToggle = ({ floating = false }) => {
  const { mode, toggleMode } = useColorMode();
  const isDark = mode === 'dark';
  const cambiarConTransicion = useThemeTransition(toggleMode);

  // Solo gira tras un clic: en la carga inicial el ícono aparece quieto
  const [girar, setGirar] = useState(false);
  const handleClick = () => {
    setGirar(true);
    cambiarConTransicion();
  };

  return (
    <Tooltip title={isDark ? 'Modo claro' : 'Modo oscuro'}>
      <IconButton
        onClick={handleClick}
        sx={{
          // Si es flotante, se posiciona arriba a la derecha
          ...(floating && {
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1300,
          }),
          width: 44,
          height: 44,
          borderRadius: '14px',
          // Glass sutil en el propio botón
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: isDark
            ? '1px solid rgba(255,255,255,0.12)'
            : '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          color: isDark ? '#FFD166' : '#5A6B85',  // sol amarillo / luna gris-azulado
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)',
          },
        }}
      >
        {/* La key remonta el ícono al cambiar de modo y dispara el giro */}
        <Box
          key={mode}
          component="span"
          sx={{
            display: 'flex',
            ...(girar && { animation: `${giro} ${duration.slow}ms ${easing.standard}` }),
            [`@media ${REDUCED_MOTION_QUERY}`]: { animation: 'none' },
          }}
        >
          {isDark ? <LightMode /> : <DarkMode />}
        </Box>
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
