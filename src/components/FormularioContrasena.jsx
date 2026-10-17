// src/components/FormularioContrasena.jsx
// ============================================================
// Formulario para que el usuario cambie su propia contraseña.
// Se usa en el diálogo "Cambiar contraseña" del perfil y en la
// pantalla de cambio obligatorio (/crear-contrasena).
//
// - Los requisitos se marcan en vivo y el botón solo se habilita
//   cuando se cumplen todos. El servidor valida lo mismo (y además
//   que no sea el correo): esto es ayuda, no la regla.
// - Al guardar, el servidor cierra las demás sesiones y entrega
//   tokens nuevos; aquí reemplazan a los actuales.
// ============================================================
import { useState, useId } from 'react';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, IconButton,
} from '@mui/material';
import {
  Visibility, VisibilityOff, CheckCircle, RadioButtonUnchecked,
} from '@mui/icons-material';
import { changeOwnPassword } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { transition } from '../theme/motion';
import useReducedMotion from '../hooks/useReducedMotion';

const MIN_LENGTH = 10;

// ── Campo de contraseña con botón para mostrar u ocultar ─────
const CampoContrasena = ({ label, value, onChange, autoComplete, autoFocus, disabled }) => {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      fullWidth
      margin="normal"
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      disabled={disabled}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setVisible((v) => !v)}
                edge="end"
                aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
                aria-pressed={visible}
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

// ── Un requisito de la lista: se marca cuando se cumple ──────
const Requisito = ({ cumplido, children }) => {
  const reduced = useReducedMotion();
  const Icono = cumplido ? CheckCircle : RadioButtonUnchecked;

  return (
    <Box
      component="li"
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        fontSize: 13.5,
        color: cumplido ? 'success.main' : 'text.secondary',
        transition: reduced ? 'none' : transition('color', 'fast', 'standard'),
      }}
    >
      <Icono sx={{ fontSize: 18 }} aria-hidden />
      <span>{children}</span>
      {/* Estado para lectores de pantalla (el color y el ícono no se leen) */}
      <Box component="span" sx={visuallyHidden}>
        {cumplido ? ' (cumplido)' : ' (pendiente)'}
      </Box>
    </Box>
  );
};

const visuallyHidden = {
  position: 'absolute', width: 1, height: 1, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
};

/**
 * @param {string}   [currentLabel] - Etiqueta del campo actual ("Contraseña temporal" en el cambio obligatorio)
 * @param {string}   [submitLabel]
 * @param {function} onSuccess      - Se llama tras guardar (los tokens ya fueron reemplazados)
 * @param {function} [onCancel]     - Si se pasa, muestra el botón Cancelar
 * @param {function} [onBusyChange] - Avisa al contenedor mientras se guarda (ej: para no cerrar el diálogo)
 * @param {object}   [submitSx]     - Estilo extra del botón principal (el azul de las páginas internas)
 */
const FormularioContrasena = ({
  currentLabel = 'Contraseña actual',
  submitLabel = 'Guardar contraseña',
  onSuccess,
  onCancel,
  onBusyChange,
  submitSx,
  autoFocus = false,
}) => {
  const { replaceTokens } = useAuth();
  const requisitosId = useId();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const requisitos = {
    longitud: nueva.length >= MIN_LENGTH,
    distinta: actual.length > 0 && nueva.length > 0 && nueva !== actual,
    coinciden: confirmacion.length > 0 && nueva === confirmacion,
  };
  const valido = Object.values(requisitos).every(Boolean);

  const setBusy = (busy) => {
    setSaving(busy);
    onBusyChange?.(busy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valido || saving) return;

    setError('');
    setBusy(true);
    try {
      const tokens = await changeOwnPassword(actual, nueva);
      replaceTokens(tokens);
      setBusy(false);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cambiar la contraseña');
      setBusy(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && <Alert severity="error" sx={{ mb: 1, borderRadius: '12px' }}>{error}</Alert>}

      <CampoContrasena
        label={currentLabel}
        value={actual}
        onChange={setActual}
        autoComplete="current-password"
        autoFocus={autoFocus}
        disabled={saving}
      />
      <CampoContrasena
        label="Nueva contraseña"
        value={nueva}
        onChange={setNueva}
        autoComplete="new-password"
        disabled={saving}
      />
      <CampoContrasena
        label="Confirmar nueva contraseña"
        value={confirmacion}
        onChange={setConfirmacion}
        autoComplete="new-password"
        disabled={saving}
      />

      <Typography id={requisitosId} sx={visuallyHidden}>
        Requisitos de la nueva contraseña
      </Typography>
      <Box
        component="ul"
        aria-labelledby={requisitosId}
        sx={{ listStyle: 'none', p: 0, m: 0, mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}
      >
        <Requisito cumplido={requisitos.longitud}>Al menos {MIN_LENGTH} caracteres</Requisito>
        <Requisito cumplido={requisitos.distinta}>Distinta de la actual</Requisito>
        <Requisito cumplido={requisitos.coinciden}>Las dos contraseñas coinciden</Requisito>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        {onCancel && (
          <Button onClick={onCancel} disabled={saving} sx={{ borderRadius: '12px', color: 'text.secondary' }}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={!valido || saving}
          fullWidth={!onCancel}
          sx={{ borderRadius: '12px', minWidth: 160, py: onCancel ? undefined : 1.3, ...submitSx }}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : submitLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default FormularioContrasena;
