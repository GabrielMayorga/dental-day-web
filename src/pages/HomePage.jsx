// src/pages/HomePage.jsx
// ============================================================
// Página de inicio. Vive dentro del Layout, así que ya no
// necesita su propia cabecera ni botón de logout.
// ============================================================
import { Box, Typography, Grid, Paper } from '@mui/material';
import { CalendarMonth, People, MedicalServices } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const quickCards = [
  { label: 'Agenda del día',   icon: CalendarMonth,   desc: 'Ver y gestionar las citas' },
  { label: 'Pacientes',        icon: People,          desc: 'Registrar y consultar pacientes' },
  { label: 'Historias',        icon: MedicalServices, desc: 'Expedientes clínicos' },
];

const HomePage = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" sx={{ color: '#0C2A4A', fontWeight: 600 }}>
        Bienvenido 🦷
      </Typography>
      <Typography variant="body1" sx={{ color: '#42648A', mt: 0.5, mb: 4 }}>
        Sesión iniciada como <strong>{user?.email}</strong> ({user?.role})
      </Typography>

      <Grid container spacing={2}>
        {quickCards.map((card) => {
          const Icon = card.icon;
          return (
            <Grid item xs={12} sm={6} md={4} key={card.label}>
              <Paper sx={{
                p: 3, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              }}>
                <Icon sx={{ fontSize: 32, color: '#1C64AD', mb: 1 }} />
                <Typography sx={{ fontWeight: 600, color: '#0C2A4A' }}>{card.label}</Typography>
                <Typography sx={{ fontSize: 13, color: '#42648A', mt: 0.5 }}>{card.desc}</Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default HomePage;
