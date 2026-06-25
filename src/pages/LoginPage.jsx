import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, InputAdornment,
} from '@mui/material';
import { LocalHospital, Email, Lock } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';

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
      <GlassCard sx={{ width: 360, maxWidth: '90vw' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px', mb: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)',
          }}>
            <LocalHospital sx={{ fontSize: 30, color: '#185FA5' }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#0C2A4A', fontWeight: 600 }}>
            Clínica Dental Day
          </Typography>
          <Typography variant="body2" sx={{ color: '#42648A' }}>
            Inicia sesión para continuar
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth label="Correo" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required margin="normal"
            InputProps={{ startAdornment: (<InputAdornment position="start"><Email sx={{ color: '#42648A' }} /></InputAdornment>) }}
          />
          <TextField
            fullWidth label="Contraseña" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required margin="normal"
            InputProps={{ startAdornment: (<InputAdornment position="start"><Lock sx={{ color: '#42648A' }} /></InputAdornment>) }}
          />
          <Button
            type="submit" fullWidth variant="contained" disabled={loading}
            sx={{ mt: 3, py: 1.3, fontSize: '15px' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar sesión'}
          </Button>
        </form>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: '#5B7A99' }}>
          Sistema de control y agenda de pacientes
        </Typography>
      </GlassCard>
    </AnimatedBackground>
  );
};

export default LoginPage;
