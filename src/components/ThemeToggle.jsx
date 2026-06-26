// src/components/ThemeToggle.jsx
// ============================================================
// Botón para alternar entre modo claro y oscuro (sol/luna).
// Estilo flotante con glass, como en portfolios modernos.
// ============================================================
import { IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useColorMode } from '../context/ThemeContext';

const ThemeToggle = ({ floating = false }) => {
  const { mode, toggleMode } = useColorMode();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Modo claro' : 'Modo oscuro'}>
      <IconButton
        onClick={toggleMode}
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
          color: isDark ? '#FFD166' : '#42648A',  // sol amarillo / luna azulada
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)',
          },
        }}
      >
        {isDark ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
