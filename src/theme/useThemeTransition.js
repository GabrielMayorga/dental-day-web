// src/theme/useThemeTransition.js
// ============================================================
// Envuelve la función que alterna el modo de color para que el
// cambio sea un fundido de colores de 400ms en vez de un salto.
//
// Agrega la clase `cambiando-tema` a <html> solo durante la
// transición (reglas en src/styles/theme-transition.css). No se deja
// activa de forma permanente: volvería lenta toda la interfaz.
// ============================================================
import { useCallback } from 'react';
import { duration } from './motion';
import { REDUCED_MOTION_QUERY } from '../hooks/useReducedMotion';

const DURACION = duration.slow; // 400ms, igual que en theme-transition.css

export const useThemeTransition = (cambiarModo) => {
  return useCallback(() => {
    const reducido = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    if (reducido) { cambiarModo(); return; }
    document.documentElement.classList.add('cambiando-tema');
    cambiarModo();
    window.setTimeout(
      () => document.documentElement.classList.remove('cambiando-tema'),
      DURACION,
    );
  }, [cambiarModo]);
};
