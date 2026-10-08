// src/components/cita/PacienteRapido.jsx
// ============================================================
// Formulario mínimo para crear un paciente sin salir del
// diálogo de nueva cita: nombre, apellido y teléfono.
// El resto de la ficha se completa luego en Pacientes.
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { Box, Stack, TextField, Button, Alert, Typography, CircularProgress } from '@mui/material';
import { createPatient } from '../../api/patients';
import { TELEFONO, mensajeError } from './comun';

// "maría josé mendez" → nombre "maría", apellido "josé mendez"
const separar = (texto = '') => {
  const [nombre = '', ...resto] = texto.trim().split(/\s+/);
  return { nombre, apellido: resto.join(' ') };
};

const validarTelefono = (valor) =>
  !valor.trim() || TELEFONO.test(valor.trim())
    ? ''
    : 'Debe tener al menos 8 dígitos; solo números, espacios, guiones, paréntesis o +';

export default function PacienteRapido({ textoInicial = '', onCreado, onCancelar }) {
  const [campos, setCampos] = useState(() => ({ ...separar(textoInicial), telefono: '' }));
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const primerCampo = useRef(null);

  // El foco va al primer campo vacío: si se llegó desde una búsqueda
  // con nombre y apellido, directo al teléfono.
  useEffect(() => {
    primerCampo.current?.focus();
  }, []);

  const cambiar = (campo) => (e) => {
    setCampos((c) => ({ ...c, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: '' }));
  };

  const validarCampo = (campo) => {
    const valor = campos[campo];
    const msg = campo === 'telefono'
      ? validarTelefono(valor)
      : (valor.trim() ? '' : 'Obligatorio');
    setErrores((er) => ({ ...er, [campo]: msg }));
    return msg;
  };

  const guardar = async (e) => {
    e.preventDefault();
    const fallos = ['nombre', 'apellido', 'telefono'].map(validarCampo).filter(Boolean);
    if (fallos.length) return;

    setGuardando(true);
    setError('');
    try {
      const paciente = await createPatient({
        first_name: campos.nombre.trim(),
        last_name: campos.apellido.trim(),
        ...(campos.telefono.trim() && { phone: campos.telefono.trim() }),
      });
      onCreado(paciente);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo crear el paciente. Inténtalo de nuevo.'));
      setGuardando(false);
    }
  };

  // Primer campo a enfocar: el primero vacío
  const enfocar = !campos.nombre ? 'nombre' : !campos.apellido ? 'apellido' : 'telefono';

  return (
    <Box component="form" onSubmit={guardar} noValidate aria-label="Nuevo paciente">
      <Typography sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5 }}>Nuevo paciente</Typography>
      <Stack spacing={1.5}>
        {error && <Alert severity="error" sx={{ borderRadius: '14px' }}>{error}</Alert>}
        <TextField
          label="Nombre"
          size="small"
          required
          value={campos.nombre}
          onChange={cambiar('nombre')}
          onBlur={() => validarCampo('nombre')}
          error={Boolean(errores.nombre)}
          helperText={errores.nombre}
          inputRef={enfocar === 'nombre' ? primerCampo : undefined}
          slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'off' } }}
          disabled={guardando}
        />
        <TextField
          label="Apellido"
          size="small"
          required
          value={campos.apellido}
          onChange={cambiar('apellido')}
          onBlur={() => validarCampo('apellido')}
          error={Boolean(errores.apellido)}
          helperText={errores.apellido}
          inputRef={enfocar === 'apellido' ? primerCampo : undefined}
          slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'off' } }}
          disabled={guardando}
        />
        <TextField
          label="Teléfono"
          size="small"
          type="tel"
          value={campos.telefono}
          onChange={cambiar('telefono')}
          onBlur={() => validarCampo('telefono')}
          error={Boolean(errores.telefono)}
          helperText={errores.telefono || 'Ej.: 8888 7777'}
          inputRef={enfocar === 'telefono' ? primerCampo : undefined}
          slotProps={{ htmlInput: { inputMode: 'tel', maxLength: 25, autoComplete: 'off' } }}
          disabled={guardando}
        />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onCancelar} disabled={guardando} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={guardando}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {guardando ? 'Guardando…' : 'Guardar paciente'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
