// src/hooks/useReducedMotion.js
// ============================================================
// true si el usuario pidió movimiento reducido en su sistema.
// Toda animación debe consultarlo: si es true, se muestra el
// estado final directamente, sin transición.
// ============================================================
import useMediaQuery from '@mui/material/useMediaQuery';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// noSsr: lee la preferencia en el primer render, para que nada
// alcance a animarse antes de saber que no debía.
const useReducedMotion = () => useMediaQuery(REDUCED_MOTION_QUERY, { noSsr: true });

export default useReducedMotion;
