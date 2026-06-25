// src/main.jsx
// ============================================================
// Punto de entrada: monta la app y aplica el tema de MUI.
// ============================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normaliza los estilos del navegador */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
