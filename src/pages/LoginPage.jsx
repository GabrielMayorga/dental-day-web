import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, InputAdornment,
} from '@mui/material';
import { Email, Lock } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <AnimatedBackground>
      <ThemeToggle floating />
      {/* En móvil: ancho fluido con márgenes laterales cómodos (nunca pegada a los bordes).
          En escritorio (sm+): mismo ancho fijo de siempre, sin cambios. */}
      <GlassCard
        sx={{
          width: { xs: 'calc(100% - 48px)', sm: 360 },
          maxWidth: { xs: 400, sm: '90vw' },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: { xs: 2, sm: 3 } }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 3,
            px: 3,
            py: 2,
            borderRadius: '14px',
            backgroundColor: '#FFFFFF',
          }}>
            <Box
              component="img"
              src="/logo-full.png"
              alt="Clínica Dental Day"
              sx={{ width: '100%', maxWidth: 260, height: 'auto', display: 'block' }}
            />
          </Box>
          <Typography
            variant="h6"
            sx={{ color: 'text.primary', fontWeight: 600, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
          >
            Clínica Dental Day
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: 13, sm: 14 } }}>
            Inicia sesión para continuar
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth label="Correo" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required margin="normal"
            InputProps={{ startAdornment: (<InputAdornment position="start"><Email sx={{ color: 'text.secondary' }} /></InputAdornment>) }}
          />
          <TextField
            fullWidth label="Contraseña" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required margin="normal"
            InputProps={{ startAdornment: (<InputAdornment position="start"><Lock sx={{ color: 'text.secondary' }} /></InputAdornment>) }}
          />
          <Button
            type="submit" fullWidth variant="contained" disabled={loading}
            sx={{ mt: 3, py: 1.3, fontSize: '15px' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar sesión'}
          </Button>
        </form>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'text.secondary' }}>
          Sistema de control y agenda de pacientes
        </Typography>
      </GlassCard>
    </AnimatedBackground>
  );
};

export default LoginPage;
