// src/components/AnimatedList.jsx
// ============================================================
// Envoltorio con entrada escalonada: cada hijo aparece con Grow y
// un retardo creciente (stagger).
//
// La entrada ocurre UNA sola vez, en el montaje inicial de la
// lista. Los hijos que llegan después (resultados de búsqueda,
// recargas tras guardar) se muestran sin reanimarse; para señalar
// la recarga se usa `refreshing`, que solo atenúa el contenedor.
// Por eso la lista no debe desmontarse al refrescar: el skeleton
// va solo en la primera carga.
//
// `component` permite usarlo como contenedor real de la lista:
//   <AnimatedList sx={{ display: 'flex', gap: 1 }}>…tarjetas…</AnimatedList>
//   <AnimatedList component={TableBody}>…filas…</AnimatedList>
// Los hijos deben aceptar ref y style (componentes MUI, Box, etc.).
// ============================================================
import { Children, isValidElement, useEffect, useState } from 'react';
import { Box, Grow } from '@mui/material';
import { duration, easing, stagger, transition, STAGGER_MAX_INDEX } from '../theme/motion';
import useReducedMotion from '../hooks/useReducedMotion';

// Tiempo hasta que termina la entrada del último elemento escalonado
const ENTRY_WINDOW_MS = stagger(STAGGER_MAX_INDEX) + duration.slow;

const AnimatedList = ({ component = 'div', refreshing = false, sx, children, ...rest }) => {
  const reduced = useReducedMotion();

  // true solo durante la ventana de entrada inicial
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), ENTRY_WINDOW_MS);
    return () => clearTimeout(timer);
  }, []);

  const animate = entering && !reduced;
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <Box
      component={component}
      sx={[
        { opacity: refreshing ? 0.55 : 1, transition: transition('opacity', 'fast') },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {items.map((child, index) => (
        <Grow
          key={child.key ?? index}
          in
          appear={animate}
          timeout={animate ? duration.slow : 0}
          easing={easing.enter}
          style={{
            transitionDelay: `${animate ? stagger(index) : 0}ms`,
            transformOrigin: '50% 0',
          }}
          // Grow deja su transition inline; al terminar se borra para que
          // las transiciones propias del hijo (hover, color) vuelvan a regir.
          onEntered={(node) => { node.style.transition = ''; }}
        >
          {child}
        </Grow>
      ))}
    </Box>
  );
};

export default AnimatedList;
