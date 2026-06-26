// src/theme/theme.js
// ============================================================
// Genera el tema de Material UI según el modo (claro u oscuro).
// Define dos paletas; MUI adapta todos los componentes solo.
// ============================================================
import { createTheme } from '@mui/material/styles';

// Recibe el modo ('light' | 'dark') y devuelve el tema completo
export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#2B7FD4',
        light: '#5BA3E8',
        dark: '#1C64AD',
      },
      secondary: {
        main: '#1D9E75',
      },
      // Colores que cambian según el modo
      ...(mode === 'light'
        ? {
            // ── MODO CLARO ──
            background: {
              default: '#EEF4FB',
              paper: '#FFFFFF',
            },
            text: {
              primary: '#0C2A4A',
              secondary: '#42648A',
            },
          }
        : {
            // ── MODO OSCURO ──
            background: {
              default: '#0B1220',   // fondo casi negro azulado
              paper: '#141C2E',     // superficies oscuras
            },
            text: {
              primary: '#E8EEF6',
              secondary: '#9DB2CC',
            },
          }),
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 },
    },

    shape: { borderRadius: 14 },

    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, padding: '10px 20px' },
        },
      },
    },
  });
