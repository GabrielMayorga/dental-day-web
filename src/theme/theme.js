// src/theme/theme.js
// ============================================================
// Tema central. Claro estilo Plandok (azul marino + grises
// suaves), oscuro estilo GitHub. Alto contraste y legibilidad.
// ============================================================
import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#0A1F44',      // azul marino Plandok
        light: '#1C3A6E',
        dark: '#061229',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#2563EB',      // azul vivo para botones/acentos
      },
      ...(mode === 'light'
        ? {
            // ── MODO CLARO (Plandok) ──
            background: {
              default: '#F4F6FA',   // gris azulado suave (no blanco puro)
              paper: '#FFFFFF',
            },
            text: {
              primary: '#0A1F44',   // azul marino oscuro = alto contraste
              secondary: '#5A6B85',
            },
            divider: 'rgba(10,31,68,0.10)',
          }
        : {
            // ── MODO OSCURO (GitHub) ──
            background: {
              default: '#0D1117',   // fondo GitHub
              paper: '#161B22',     // superficies GitHub
            },
            text: {
              primary: '#E6EDF3',   // texto claro que resalta
              secondary: '#9DA7B3',
            },
            divider: '#30363D',
          }),
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },

    shape: { borderRadius: 14 },

    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, padding: '10px 20px' },
          // Botón principal: azul vivo, bien visible en ambos modos
          containedPrimary: {
            backgroundColor: '#2563EB',
            '&:hover': { backgroundColor: '#1D4FD7' },
          },
        },
      },
    },
  });
