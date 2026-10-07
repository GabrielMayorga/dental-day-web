// src/hooks/useAutoRefresh.js
// ============================================================
// Carga datos y los mantiene frescos mientras la pestaña está a
// la vista.
//
//   const { data, error, loading, refreshing, lastUpdated, refresh, mutate }
//     = useAutoRefresh(fetcher, { intervalMs: 60000 });
//
// - fetcher(signal) devuelve una promesa. Debe ser estable
//   (useCallback): si cambia, se vuelve a cargar. null = inactivo.
// - loading solo es true en la PRIMERA carga. En los refrescos se
//   usa refreshing y data conserva el valor anterior: nada de
//   esqueletos ni parpadeos.
// - Solo consulta con la pestaña visible. Una pestaña olvidada en
//   segundo plano mantendría la base de datos despierta toda la
//   noche y gastaría la cuota gratuita de cómputo. Al volver a la
//   pestaña refresca de inmediato.
// - Cada petición cancela la anterior (AbortController) y se ignora
//   cualquier respuesta que no sea la última: una respuesta vieja
//   nunca sobrescribe una nueva.
// - Si un refresco falla, data se mantiene y error queda con el
//   fallo: la pantalla decide cómo avisar sin vaciarse.
// - mutate(updater) cambia data al instante (actualización
//   optimista); el siguiente refresh trae la verdad del servidor.
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';

const isVisible = () => document.visibilityState === 'visible';

const useAutoRefresh = (fetcher, { intervalMs = 60000 } = {}) => {
  const [state, setState] = useState({
    data: undefined,
    error: null,
    loading: Boolean(fetcher),
    refreshing: false,
    lastUpdated: null,
  });

  const fetcherRef    = useRef(fetcher);
  const controllerRef = useRef(null);
  const requestIdRef  = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refresh = useCallback(async () => {
    const run = fetcherRef.current;
    if (!run) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestIdRef.current;

    // Si aún no hay datos sigue siendo la primera carga (loading)
    setState((s) => ({ ...s, refreshing: !s.loading }));

    try {
      const data = await run(controller.signal);
      if (id !== requestIdRef.current) return;
      setState({ data, error: null, loading: false, refreshing: false, lastUpdated: new Date() });
    } catch (error) {
      // Cancelada o superada por otra más nueva: no es un error
      if (controller.signal.aborted || id !== requestIdRef.current) return;
      setState((s) => ({ ...s, error, loading: false, refreshing: false }));
    }
  }, []);

  const mutate = useCallback((updater) => {
    setState((s) => ({ ...s, data: updater(s.data) }));
  }, []);

  // Primera carga y recarga si cambia el fetcher. Al desmontar se
  // cancela lo que esté en curso.
  useEffect(() => {
    if (!fetcher) return undefined;
    refresh();
    return () => controllerRef.current?.abort();
  }, [fetcher, refresh]);

  // Sondeo periódico, solo con la pestaña visible
  useEffect(() => {
    if (!fetcher) return undefined;
    const tick = () => { if (isVisible()) refresh(); };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fetcher, intervalMs, refresh]);

  return { ...state, refresh, mutate };
};

export default useAutoRefresh;
