// src/theme/theme.js
// ============================================================
// Tema central. Claro estilo Plandok (azul marino + grises
// suaves), oscuro estilo GitHub. Alto contraste y legibilidad.
// ============================================================
import { createTheme } from '@mui/material/styles';
import DialogTransition from '../components/DialogTransition';
import { duration, easing } from './motion';
import { REDUCED_MOTION_QUERY } from '../hooks/useReducedMotion';

export const REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';
const NO_BACKDROP_FILTER =
  '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))';

// ── Niveles de vidrio ──────────────────────────────────────────
// Objetos listos para esparcir en `sx` según el tipo de superficie:
//   card   → resúmenes, KPIs, panel del día, notificaciones
//   dense  → agenda, tablas, formularios y diálogos (casi opaco:
//            la legibilidad de grillas y campos va primero)
//   chrome → barra lateral y barra superior (sin borde propio)
// Sin backdrop-filter se cae a alpha 0.95; con transparencia
// reducida, superficie opaca.
const getGlass = (mode) => {
  const isLight = mode === 'light';
  const tint = isLight ? '255,255,255' : '22,27,34'; // = background.paper
  const solid = isLight ? '#FFFFFF' : '#161B22';
  const edge = isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)';
  const blur = 'blur(16px) saturate(140%)';

  const surface = (a, { bordered = true } = {}) => ({
    background: `rgba(${tint},${a})`,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    ...(bordered && { border: `1px solid ${edge}` }),
    [NO_BACKDROP_FILTER]: { background: `rgba(${tint},${Math.max(a, 0.95)})` },
    [`@media ${REDUCED_TRANSPARENCY_QUERY}`]: {
      background: solid, backdropFilter: 'none', WebkitBackdropFilter: 'none',
    },
  });

  return {
    edge,
    card:   surface(isLight ? 0.65 : 0.55),
    dense:  surface(isLight ? 0.94 : 0.92),
    chrome: surface(0.75, { bordered: false }),
  };
};

export const getTheme = (mode) => {
  const glass = getGlass(mode);

  return createTheme({
    glass,

    palette: {
      mode,
      primary: mode === 'light'
        ? {
            main: '#0A1F44',      // azul marino Plandok
            light: '#1C3A6E',
            dark: '#061229',
            contrastText: '#FFFFFF',
          }
        : {
            // En oscuro el marino desaparece sobre #0D1117: azules más luminosos
            main: '#3B82F6',
            light: '#60A5FA',
            dark: '#2563EB',
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
            // Elevación por luminosidad: en oscuro las sombras no se ven,
            // así que cada nivel de jerarquía es una superficie más clara.
            surface: {
              0: '#0D1117',   // fondo
              1: '#161B22',   // tarjetas secundarias
              2: '#1C2430',   // bloque principal
              3: '#222B38',   // hover
            },
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

    // Lenguaje de movimiento (src/theme/motion.js) mapeado a los
    // nombres de MUI, para que sus componentes lo hereden.
    transitions: {
      duration: {
        shortest:       duration.press,
        shorter:        duration.fast,
        short:          duration.fast,
        standard:       duration.base,
        complex:        duration.slow,
        enteringScreen: duration.base,
        leavingScreen:  duration.fast,
      },
      easing: {
        easeInOut: easing.standard,
        easeOut:   easing.enter,
        easeIn:    easing.exit,
        sharp:     easing.standard,
      },
    },

    // Las transiciones de MUI (Grow, Fade, Collapse, diálogos, menús)
    // se reducen a 0ms si el sistema pide movimiento reducido.
    motion: { reducedMotion: 'system' },

    components: {
      MuiDialog: {
        defaultProps: { slots: { transition: DialogTransition } },
        styleOverrides: { paper: glass.dense },
      },
      // Pulso (opacidad) en vez de onda (desplazamiento)
      MuiSkeleton: {
        defaultProps: { animation: 'pulse' },
        styleOverrides: {
          root: { [`@media ${REDUCED_MOTION_QUERY}`]: { animation: 'none' } },
        },
      },
      MuiButton: {
        styleOverrides: {
          // Escala a 0.97 al presionar: sensación táctil en todo el sistema
          root: ({ theme }) => ({
            borderRadius: 12,
            padding: '10px 20px',
            transition: `${theme.transitions.create(
              ['background-color', 'box-shadow', 'border-color', 'color'],
              { duration: duration.fast },
            )}, transform ${duration.press}ms ${easing.standard}`,
            '&:active': { transform: 'scale(0.97)' },
            [`@media ${REDUCED_MOTION_QUERY}`]: { '&:active': { transform: 'none' } },
          }),
          // Botón principal: azul vivo, bien visible en ambos modos
          containedPrimary: mode === 'light'
            ? {
                backgroundColor: '#2563EB',
                '&:hover': { backgroundColor: '#1D4FD7' },
              }
            : {
                backgroundColor: '#3B82F6',
                '&:hover': { backgroundColor: '#2563EB' },
              },
          // Sin relleno necesitan más luminosidad para leerse en oscuro
          ...(mode === 'dark' && {
            outlinedPrimary: { color: '#60A5FA', borderColor: '#60A5FA' },
            textPrimary: { color: '#60A5FA' },
          }),
        },
      },
    },
  });
};
