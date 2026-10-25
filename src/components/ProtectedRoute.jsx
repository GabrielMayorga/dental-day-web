// src/components/ProtectedRoute.jsx
// ============================================================
// Protege rutas privadas: si no hay usuario logueado,
// redirige al login. Equivalente frontend al middleware
// authenticate del backend.
// Si se pasa 'roles', además exige que el rol del usuario
// esté en la lista; si no, lo manda al inicio.
// ============================================================
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

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

  // Si la ruta está limitada a ciertos roles y el usuario no tiene uno, al inicio
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Si hay usuario, muestra la página
  return children;
};

export default ProtectedRoute;
