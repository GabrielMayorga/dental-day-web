import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, InputAdornment,
} from '@mui/material';
import { LocalHospital, Email, Lock } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import ThemeToggle from '../components/ThemeToggle';
import { useColorMode } from '../context/ThemeContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { mode } = useColorMode();
  const isDark = mode === 'dark';
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
      <GlassCard sx={{ width: 360, maxWidth: '90vw' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px', mb: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.7)',
          }}>
            <LocalHospital sx={{ fontSize: 30, color: 'primary.dark' }} />
          </Box>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Clínica Dental Day
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
