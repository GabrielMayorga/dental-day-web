// src/components/ProtectedRoute.jsx
// ============================================================
// Protege rutas privadas: si no hay usuario logueado,
// redirige al login. Equivalente frontend al middleware
// authenticate del backend.
// Si el usuario debe crear su contraseña, la única ruta
// disponible es /crear-contrasena (passwordChange).
// ============================================================
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { PASSWORD_CHANGE_PATH } from '../api/client';

const ProtectedRoute = ({ children, passwordChange = false }) => {
  const { user, loading, mustChangePassword } = useAuth();

  // Mientras verifica el token, muestra un spinner
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no hay usuario, al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Cambio obligatorio pendiente: cualquier otra ruta lleva a crearla
  if (mustChangePassword && !passwordChange) {
    return <Navigate to={PASSWORD_CHANGE_PATH} replace />;
  }

  // Sin cambio pendiente, la pantalla de crear contraseña no aplica
  if (!mustChangePassword && passwordChange) {
    return <Navigate to="/" replace />;
  }

  // Si hay usuario, muestra la página
  return children;
};

export default ProtectedRoute;
