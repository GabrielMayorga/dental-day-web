// src/theme/motion.js
// ============================================================
// Lenguaje de movimiento del sistema: duraciones, curvas y
// escalonado. Todo componente animado toma sus valores de aquí
// (directamente o vía theme.transitions), nunca números sueltos.
//
// Regla: ninguna animación de respuesta a una acción del usuario
// supera duration.slow (400ms).
// ============================================================

export const duration = {
  press:   100,   // escala de botones al presionar
  fast:    200,   // hover, salidas, cambios de superficie
  base:    300,   // entradas de diálogo, fade entre rutas
  slow:    400,   // entradas de tarjetas, cambio de color de estado
  counter: 800,   // contadores de KPI (solo al cargar datos)
};

export const easing = {
  // Entrada: arranca rápido y frena al llegar (desaceleración)
  enter:    'cubic-bezier(0.0, 0.0, 0.2, 1)',
  // Salida: arranca suave y acelera al irse
  exit:     'cubic-bezier(0.4, 0.0, 1, 1)',
  // Cambios dentro de la pantalla (hover, color)
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
};

export const STAGGER_STEP = 70;
// A partir de este índice el retardo deja de crecer: en listas largas
// la entrada no se alarga indefinidamente.
export const STAGGER_MAX_INDEX = 5;

// Retardo de entrada (ms) del elemento `index` en una lista escalonada.
export const stagger = (index, step = STAGGER_STEP) =>
  Math.min(index, STAGGER_MAX_INDEX) * step;

// Atajo para transiciones CSS: transition('transform', 'fast', 'enter')
export const transition = (property, d = 'fast', e = 'standard') =>
  `${property} ${duration[d]}ms ${easing[e]}`;
