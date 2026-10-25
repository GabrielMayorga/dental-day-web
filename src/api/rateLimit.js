// src/api/rateLimit.js
// ============================================================
// Utilidades para las respuestas 429 (límite de peticiones).
//
// El backend (express-rate-limit, draft-8) envía:
//   Retry-After: 50                      (segundos)
//   RateLimit:   "login";r=0;t=50        (t = segundos hasta reiniciar)
// Ambas cabeceras están expuestas por CORS; sin eso el navegador
// no las dejaría leer.
// ============================================================

export const isRateLimited = (error) => error?.response?.status === 429;

// Segundos hasta poder reintentar. Primero Retry-After, luego
// RateLimit (t=… de draft-8 o reset=… de borradores anteriores).
// Si no viene ninguna legible se usa `fallback`.
export const retryAfterSeconds = (error, fallback = 60) => {
  const headers = error?.response?.headers;
  if (!headers) return fallback;
  const get = (name) => (typeof headers.get === 'function' ? headers.get(name) : headers[name]);

  // express-rate-limit siempre manda Retry-After en segundos; el
  // formato de fecha HTTP no se usa y cae a RateLimit.
  const retryAfter = Number(get('retry-after'));
  if (get('retry-after') && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.ceil(retryAfter);
  }

  const rateLimit = get('ratelimit');
  const match = rateLimit && String(rateLimit).match(/(?:[;,\s]t|reset)=(\d+)/);
  if (match) return Number(match[1]);

  return fallback;
};
