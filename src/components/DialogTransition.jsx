// src/components/DialogTransition.jsx
// ============================================================
// Transición por defecto de todos los diálogos (registrada en el
// tema): entra con Grow y curva de entrada; sale solo con fade,
// más rápido y con curva de salida.
// ============================================================
import { forwardRef } from 'react';
import { Grow } from '@mui/material';
import { duration, transition } from '../theme/motion';
import useReducedMotion from '../hooks/useReducedMotion';

// Grow aplica la curva solo a la escala y encoge al salir. Los
// callbacks corren después de que Grow fija su transición, así que
// aquí se reescribe: entrada completa con curva de entrada, salida
// solo de opacidad con curva de salida.
const DialogTransition = forwardRef(function DialogTransition(
  { in: inProp, style, onEnter, onExit, ...props },
  ref,
) {
  const reduced = useReducedMotion();
  return (
    <Grow
      ref={ref}
      in={inProp}
      {...props}
      // Al salir la escala queda fija en 1. Grow la pone en 0.75 por dos
      // vías (estilo del render de "exiting" y escritura directa en el
      // nodo en onExit); hay que anular ambas o el diálogo encoge de golpe.
      style={inProp ? style : { ...style, transform: 'none' }}
      timeout={reduced ? 0 : { enter: duration.base, exit: duration.fast }}
      onEnter={(node, isAppearing) => {
        if (!reduced) {
          node.style.transition = `${transition('opacity', 'base', 'enter')}, ${transition('transform', 'base', 'enter')}`;
        }
        onEnter?.(node, isAppearing);
      }}
      onExit={(node) => {
        node.style.transform = 'none';
        if (!reduced) node.style.transition = transition('opacity', 'fast', 'exit');
        onExit?.(node);
      }}
    />
  );
});

export default DialogTransition;
