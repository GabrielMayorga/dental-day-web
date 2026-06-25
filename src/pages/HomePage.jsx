// src/pages/HomePage.jsx
// ============================================================
// Página de inicio temporal (después la haremos completa con
// la agenda, pacientes, etc.). Por ahora confirma el login.
// ============================================================
import { Box, Typography, Button, Container } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { user, logout } = useAuth();

  return (
    <Container sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#0C2A4A' }}>
            Bienvenido 🦷
          </Typography>
          <Typography variant="body1" sx={{ color: '#42648A', mt: 1 }}>
            Has iniciado sesión como <strong>{user?.email}</strong> ({user?.role})
          </Typography>
        </Box>
        <Button variant="outlined" onClick={logout}>Cerrar sesión</Button>
      </Box>

      <Typography variant="body2" sx={{ color: '#5B7A99', mt: 4 }}>
        Próximamente aquí: la agenda de citas y la gestión de pacientes.
      </Typography>
    </Container>
  );
};

export default HomePage;
