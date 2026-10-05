// src/components/SystemBackground.jsx
// ============================================================
// Fondo estático del sistema interno (todo lo que va dentro de
// Layout). Variante de AnimatedBackground pensada para estar
// detrás del contenido todo el tiempo:
// - Una sola capa fija con gradientes radiales: sin filter: blur
//   ni animación, así no cuesta nada al hacer scroll.
// - Le da al backdrop-filter de las tarjetas algo que desenfocar.
// El color base lo pone el body (background.default vía CssBaseline).
// ============================================================
import { Box } from '@mui/material';
import { useColorMode } from '../context/ThemeContext';
import { REDUCED_TRANSPARENCY_QUERY } from '../theme/theme';

// Mancha difusa: el degradado se desvanece a transparente en el 70%
const blob = (x, y, size, color) =>
  `radial-gradient(${size} ${size} at ${x} ${y}, ${color} 0%, transparent 70%)`;

const LIGHT = [
  blob('8%',   '0%',   '55vmax', 'rgba(74,111,165,0.14)'),   // azul pizarra
  blob('95%',  '30%',  '45vmax', 'rgba(91,127,181,0.11)'),
  blob('35%',  '105%', '50vmax', 'rgba(122,147,194,0.09)'),
  blob('100%', '100%', '30vmax', 'rgba(245,166,35,0.06)'),   // guiño ámbar al isotipo
];

const DARK = [
  blob('8%',  '0%',   '55vmax', 'rgba(30,58,110,0.20)'),     // #1E3A6E
  blob('95%', '35%',  '45vmax', 'rgba(37,99,235,0.12)'),     // #2563EB
  blob('30%', '105%', '50vmax', 'rgba(30,58,110,0.16)'),
];

const SystemBackground = () => {
  const { mode } = useColorMode();

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
        backgroundImage: (mode === 'dark' ? DARK : LIGHT).join(', '),
        [`@media ${REDUCED_TRANSPARENCY_QUERY}`]: { display: 'none' },
      }}
    />
  );
};

export default SystemBackground;
