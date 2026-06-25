// src/theme/theme.js
// ============================================================
// Tema central de Material UI para la Clínica Dental Day.
// Define la paleta de colores, tipografía y ajustes globales
// que TODOS los componentes heredan automáticamente.
// ============================================================
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1C64AD',      // Azul de la clínica
      light: '#2B7FD4',
      dark: '#0C447C',
    },
    secondary: {
      main: '#1D9E75',      // Verde/teal de acento
    },
    background: {
      default: '#EEF4FB',   // Fondo general suave
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0C2A4A',
      secondary: '#42648A',
    },
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 }, // Botones sin MAYÚSCULAS
  },

  shape: {
    borderRadius: 12,   // Esquinas redondeadas en todo
  },

  components: {
    // Botones con un poco más de presencia
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
        },
      },
    },
  },
});

export default theme;
