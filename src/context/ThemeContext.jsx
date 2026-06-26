// src/context/ThemeContext.jsx
// ============================================================
// Contexto del modo de color (claro/oscuro).
// - Recuerda la preferencia en localStorage.
// - La primera vez, detecta el modo del sistema operativo.
// ============================================================
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../theme/theme';

const ColorModeContext = createContext(null);

// Determina el modo inicial: lo guardado, o el del sistema
const getInitialMode = () => {
  const saved = localStorage.getItem('colorMode');
  if (saved === 'light' || saved === 'dark') return saved;
  // Detecta la preferencia del sistema operativo
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  // Guarda la preferencia cada vez que cambia
  useEffect(() => {
    localStorage.setItem('colorMode', mode);
  }, [mode]);

  // Alterna entre claro y oscuro
  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Genera el tema solo cuando cambia el modo (optimización)
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
};

// Hook para usar el modo: const { mode, toggleMode } = useColorMode();
export const useColorMode = () => {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode debe usarse dentro de ColorModeProvider');
  return ctx;
};
