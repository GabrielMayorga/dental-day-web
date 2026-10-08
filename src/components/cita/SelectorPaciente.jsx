// src/components/cita/SelectorPaciente.jsx
// ============================================================
// Columna de paciente del diálogo de nueva cita: búsqueda con
// debounce, navegación con teclado y creación rápida en el
// mismo panel (sin abrir otro diálogo encima).
// ============================================================
import { useState, useEffect, useRef, useId } from 'react';
import {
  Box, TextField, InputAdornment, Avatar, Typography, Button,
  Skeleton, CircularProgress,
} from '@mui/material';
import { Search, PersonAdd, SwapHoriz } from '@mui/icons-material';
import { getPatients } from '../../api/patients';
import { iniciales, nombreCompleto } from './comun';
import PacienteRapido from './PacienteRapido';
import { transition } from '../../theme/motion';

const DEBOUNCE_MS = 300;
const MAX_RESULTADOS = 8;

const AvatarPaciente = ({ paciente, size = 36 }) => (
  <Avatar sx={{ width: size, height: size, fontSize: size * 0.4, bgcolor: 'secondary.main', color: '#fff' }}>
    {iniciales(paciente.first_name, paciente.last_name)}
  </Avatar>
);

export default function SelectorPaciente({ paciente, onChange, onCreado }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState({ texto: '', lista: [], error: false });
  const [activo, setActivo] = useState(0);
  const [creando, setCreando] = useState(null);   // null | { textoInicial }
  const listaId = useId();
  const inputRef = useRef(null);

  const consulta = texto.trim();
  const buscando = consulta !== '' && resultados.texto !== consulta;
  const lista = consulta && !buscando ? resultados.lista : [];

  // Búsqueda con debounce; cada búsqueda cancela la anterior
  useEffect(() => {
    if (!consulta) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getPatients(consulta, { signal: controller.signal })
        .then((pacientes) => {
          setResultados({ texto: consulta, lista: pacientes.slice(0, MAX_RESULTADOS), error: false });
          setActivo(0);
        })
        .catch((err) => {
          if (err?.code === 'ERR_CANCELED') return;
          setResultados({ texto: consulta, lista: [], error: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [consulta]);

  const elegir = (p) => onChange(p);

  const onKeyDown = (e) => {
    if (!lista.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((i) => (i + 1) % lista.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => (i - 1 + lista.length) % lista.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      elegir(lista[activo]);
    }
  };

  // ── Paciente ya elegido ─────────────────────────────────────
  if (paciente) {
    return (
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
          borderRadius: '14px', border: 1, borderColor: 'divider',
        }}
      >
        <AvatarPaciente paciente={paciente} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
            {nombreCompleto(paciente)}
          </Typography>
          {paciente.phone && (
            <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
              {paciente.phone}
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          startIcon={<SwapHoriz />}
          onClick={() => {
            onChange(null);
            // Al volver a la búsqueda, el foco regresa al buscador
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          Cambiar
        </Button>
      </Box>
    );
  }

  // ── Creación rápida en el mismo panel ───────────────────────
  if (creando) {
    return (
      <PacienteRapido
        textoInicial={creando.textoInicial}
        onCancelar={() => {
          setCreando(null);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        onCreado={(nuevo) => {
          setCreando(null);
          onCreado(nuevo);
        }}
      />
    );
  }

  // ── Búsqueda ────────────────────────────────────────────────
  const opcionId = (i) => `${listaId}-op-${i}`;
  const sinResultados = consulta && !buscando && !resultados.error && lista.length === 0;

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        autoFocus
        placeholder="Buscar por nombre o apellido"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={onKeyDown}
        inputRef={inputRef}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
            ),
            endAdornment: buscando ? (
              <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
            ) : null,
          },
          htmlInput: {
            role: 'combobox',
            'aria-label': 'Buscar paciente',
            'aria-expanded': lista.length > 0,
            'aria-controls': listaId,
            'aria-autocomplete': 'list',
            'aria-activedescendant': lista.length ? opcionId(activo) : undefined,
            autoComplete: 'off',
          },
        }}
      />

      <Box sx={{ mt: 1, minHeight: 56 }}>
        {buscando && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width={['70%', '55%', '62%'][i]} />
                  <Skeleton variant="text" width="35%" sx={{ fontSize: 12 }} />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {!consulta && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', px: 1, py: 1 }}>
            Escribe el nombre del paciente para buscarlo.
          </Typography>
        )}

        {resultados.error && consulta && !buscando && (
          <Typography sx={{ fontSize: 13, color: 'error.main', px: 1, py: 1 }}>
            No se pudo buscar. Revisa la conexión e inténtalo de nuevo.
          </Typography>
        )}

        {lista.length > 0 && (
          <Box component="ul" id={listaId} role="listbox" aria-label="Pacientes encontrados" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {lista.map((p, i) => (
              <Box
                component="li"
                key={p.id}
                id={opcionId(i)}
                role="option"
                aria-selected={i === activo}
                onMouseEnter={() => setActivo(i)}
                onMouseDown={(e) => e.preventDefault()}   // no quitar el foco del buscador
                onClick={() => elegir(p)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1,
                  borderRadius: '14px', cursor: 'pointer',
                  transition: transition('background-color', 'fast'),
                  bgcolor: i === activo ? 'action.hover' : 'transparent',
                }}
              >
                <AvatarPaciente paciente={p} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {nombreCompleto(p)}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {p.phone || 'Sin teléfono'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {sinResultados && (
          <Box sx={{ px: 1, py: 1 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
              No hay pacientes con ese nombre.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={() => setCreando({ textoInicial: consulta })}
              sx={{ maxWidth: '100%', justifyContent: 'flex-start' }}
            >
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Crear «{consulta}»
              </Box>
            </Button>
          </Box>
        )}
      </Box>

      <Button
        fullWidth
        startIcon={<PersonAdd />}
        onClick={() => setCreando({ textoInicial: '' })}
        sx={{ mt: 1, justifyContent: 'flex-start' }}
      >
        Nuevo paciente
      </Button>
    </Box>
  );
}
