// src/api/tokens.js
// ============================================================
// Guardado de la sesión en el navegador: access token, refresh
// token y el motivo del último cierre de sesión forzado.
// Único lugar que toca estas claves de localStorage.
// ============================================================

const ACCESS_KEY = 'token';
const REFRESH_KEY = 'refreshToken';
// En sessionStorage: solo debe sobrevivir a la redirección al login
const LOGOUT_REASON_KEY = 'logoutReason';

export const LOGOUT_REASONS = {
  SESSION_REVOKED: 'session_revoked',
};

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = ({ accessToken, refreshToken }) => {
  localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

/**
 * Lee los claims de un JWT SIN verificar la firma. Solo sirve para
 * decidir qué mostrar (ej: mcp); el servidor es quien hace cumplir.
 */
export const readClaims = (token = getAccessToken()) => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

// mcp = must_change_password: el usuario debe crear su contraseña
export const tokenRequiresPasswordChange = (token) => readClaims(token)?.mcp === true;

export const setLogoutReason = (reason) => {
  try { sessionStorage.setItem(LOGOUT_REASON_KEY, reason); } catch { /* sin almacenamiento */ }
};

export const getLogoutReason = () => {
  try { return sessionStorage.getItem(LOGOUT_REASON_KEY); } catch { return null; }
};

export const clearLogoutReason = () => {
  try { sessionStorage.removeItem(LOGOUT_REASON_KEY); } catch { /* sin almacenamiento */ }
};
