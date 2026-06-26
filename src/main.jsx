// src/main.jsx
// ============================================================
// Punto de entrada. El ColorModeProvider ahora envuelve la app
// y maneja el tema (claro/oscuro) internamente.
// ============================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ColorModeProvider } from './context/ThemeContext';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ColorModeProvider>
      <App />
    </ColorModeProvider>
  </React.StrictMode>
);
