// src/components/agenda/AgendaToolbar.jsx
// ============================================================
// Barra superior de la agenda, estilo Calendario de Apple:
//   - Título grande ("Octubre 2026"): el mes en negrita y el año
//     en peso normal, con tracking negativo por el tamaño.
//   - Flechas y "Hoy" agrupados a la izquierda del selector.
//   - Selector segmentado Día / Semana / Mes con un "pulgar" que
//     se desliza a la opción elegida.
//
// Reemplaza la toolbar de FullCalendar (headerToolbar={false}):
// la nuestra usa los componentes y el tema de la app, y controla
// el calendario por su API (prev, next, today, changeView).
// ============================================================
import { Box, ButtonBase, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight, Add } from '@mui/icons-material';
import useReducedMotion from '../../hooks/useReducedMotion';

// Curva tipo iOS: arranque rápido y llegada muy suave, sin rebote
// (equivale a un resorte críticamente amortiguado).
const CURVA_IOS = 'cubic-bezier(0.32, 0.72, 0, 1)';

const VISTAS = [
  { id: 'timeGridDay',  etiqueta: 'Día' },
  { id: 'timeGridWeek', etiqueta: 'Semana' },
  { id: 'dayGridMonth', etiqueta: 'Mes' },
];

function Segmentado({ valor, onCambiar, oscuro }) {
  const reducido = useReducedMotion();
  const indice = Math.max(0, VISTAS.findIndex((v) => v.id === valor));

  return (
    <Box
      role="tablist"
      aria-label="Vista del calendario"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${VISTAS.length}, 1fr)`,
        p: '3px',
        borderRadius: '10px',
        bgcolor: oscuro ? 'rgba(255,255,255,0.08)' : 'rgba(10,31,68,0.06)',
        minWidth: { xs: '100%', sm: 228 },
      }}
    >
      {/* Pulgar: se mueve con transform, nunca con left/width */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 3, bottom: 3, left: 3,
          width: `calc((100% - 6px) / ${VISTAS.length})`,
          borderRadius: '8px',
          bgcolor: oscuro ? '#2D3643' : '#FFFFFF',
          boxShadow: oscuro
            ? '0 1px 2px rgba(0,0,0,0.4)'
            : '0 1px 3px rgba(10,31,68,0.12), 0 0 0 0.5px rgba(10,31,68,0.06)',
          transform: `translateX(${indice * 100}%)`,
          transition: reducido ? 'none' : `transform 320ms ${CURVA_IOS}`,
        }}
      />
      {VISTAS.map((v) => {
        const activo = v.id === valor;
        return (
          <ButtonBase
            key={v.id}
            role="tab"
            aria-selected={activo}
            onClick={() => onCambiar(v.id)}
            sx={{
              position: 'relative',
              zIndex: 1,
              height: 30,
              borderRadius: '8px',
              fontSize: 13,
              fontWeight: activo ? 600 : 500,
              color: activo ? 'text.primary' : 'text.secondary',
              transition: 'color 200ms ease',
              // Respuesta inmediata al presionar
              '&:active': { transform: reducido ? 'none' : 'scale(0.97)' },
            }}
          >
            {v.etiqueta}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export default function AgendaToolbar({
  titulo, subtitulo, vista, onVista, onAnterior, onSiguiente, onHoy, onNueva, oscuro, isMobile,
}) {
  const flecha = {
    width: 34, height: 34,
    color: 'text.primary',
    bgcolor: oscuro ? 'rgba(255,255,255,0.06)' : 'rgba(10,31,68,0.05)',
    '&:hover': { bgcolor: oscuro ? 'rgba(255,255,255,0.12)' : 'rgba(10,31,68,0.09)' },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: { xs: 1.5, md: 2 },
        mb: { xs: 1.5, md: 2 },
      }}
    >
      {/* Título: mes en negrita, año normal */}
      <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 26, md: 32 },
            lineHeight: 1.1,
            letterSpacing: '-0.022em',
            color: 'text.primary',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {titulo.principal}
          {titulo.secundario && (
            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}> {titulo.secundario}</Box>
          )}
        </Typography>
        {subtitulo && (
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mt: 0.5 }}>{subtitulo}</Typography>
        )}
      </Box>

      {/* Navegación */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Tooltip title="Anterior">
          <IconButton aria-label="Anterior" onClick={onAnterior} sx={flecha}><ChevronLeft fontSize="small" /></IconButton>
        </Tooltip>
        <Button
          onClick={onHoy}
          sx={{
            height: 34, minWidth: 0, px: 1.75, borderRadius: '17px',
            fontSize: 13.5, fontWeight: 600, color: 'text.primary',
            bgcolor: oscuro ? 'rgba(255,255,255,0.06)' : 'rgba(10,31,68,0.05)',
            '&:hover': { bgcolor: oscuro ? 'rgba(255,255,255,0.12)' : 'rgba(10,31,68,0.09)' },
          }}
        >
          Hoy
        </Button>
        <Tooltip title="Siguiente">
          <IconButton aria-label="Siguiente" onClick={onSiguiente} sx={flecha}><ChevronRight fontSize="small" /></IconButton>
        </Tooltip>
        {/* Móvil: "+" en la barra, como en Calendario del iPhone
            (un botón flotante taparía citas de la tarde) */}
        {isMobile && (
          <IconButton
            aria-label="Nueva cita"
            onClick={onNueva}
            sx={{
              ml: 0.5, width: 34, height: 34, color: '#fff', bgcolor: '#2563EB',
              '&:hover': { bgcolor: '#1D4ED8' },
              '&:active': { transform: 'scale(0.94)' },
              transition: 'transform 100ms ease-out',
            }}
          >
            <Add />
          </IconButton>
        )}
      </Box>

      {/* En móvil el selector ocupa su propia fila a lo ancho */}
      <Box sx={{ order: { xs: 3, md: 0 }, width: { xs: '100%', md: 'auto' } }}>
        <Segmentado valor={vista} onCambiar={onVista} oscuro={oscuro} />
      </Box>

      {!isMobile && (
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onNueva}
          disableElevation
          sx={{
            height: 36, borderRadius: '18px', px: 2,
            bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' },
            '&:active': { transform: 'scale(0.97)' },
            transition: 'transform 100ms ease-out, background-color 200ms ease',
          }}
        >
          Nueva cita
        </Button>
      )}
    </Box>
  );
}
