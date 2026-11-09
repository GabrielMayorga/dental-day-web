// src/components/agenda/FiltroOdontologos.jsx
// ============================================================
// Filtro de la agenda por odontólogo, como la lista de
// calendarios de Apple: cada odontólogo es una píldora con su
// color, sus iniciales y cuántas citas tiene en el rango visible.
//
// - "Todos" muestra la agenda completa.
// - Tocar un odontólogo deja solo sus citas; tocar otro lo suma.
// - Quitar el último vuelve a "Todos".
//
// El filtro se aplica en el navegador sobre las citas ya cargadas,
// así la respuesta es inmediata y el calendario no se reinicia.
// ============================================================
import { Box, ButtonBase } from '@mui/material';
import { Check } from '@mui/icons-material';
import { nombreOdontologo, inicialesOdontologo, colorOdontologo, tinte, tinta } from '../../utils/odontologos';

function Pildora({ activo, onClick, color, oscuro, children, etiqueta }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={activo}
      aria-label={etiqueta}
      sx={{
        flexShrink: 0,
        height: 36,
        pl: 0.5,
        pr: 1.5,
        gap: 1,
        borderRadius: '18px',
        fontSize: 13.5,
        fontWeight: 600,
        border: '1px solid',
        borderColor: activo
          ? (color ? tinte(color, 55) : 'transparent')
          : (oscuro ? 'rgba(255,255,255,0.10)' : 'rgba(10,31,68,0.10)'),
        bgcolor: activo
          ? (color ? tinte(color, oscuro ? 24 : 12) : (oscuro ? '#E6EDF3' : '#0A1F44'))
          : (oscuro ? 'rgba(255,255,255,0.04)' : '#FFFFFF'),
        color: activo
          ? (color ? tinta(color, oscuro) : (oscuro ? '#0D1117' : '#FFFFFF'))
          : 'text.primary',
        transition: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease, transform 100ms ease-out',
        '&:active': { transform: 'scale(0.97)' },
        '&:hover': activo ? {} : { bgcolor: oscuro ? 'rgba(255,255,255,0.08)' : 'rgba(10,31,68,0.04)' },
      }}
    >
      {children}
    </ButtonBase>
  );
}

const Contador = ({ n }) => (
  <Box component="span" sx={{ fontWeight: 500, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{n}</Box>
);

export default function FiltroOdontologos({ dentists, seleccion, onCambiar, conteos, total, oscuro }) {
  const todos = seleccion.length === 0;

  const alternar = (id) => {
    const ya = seleccion.includes(id);
    onCambiar(ya ? seleccion.filter((s) => s !== id) : [...seleccion, id]);
  };

  return (
    <Box
      role="group"
      aria-label="Filtrar por odontólogo"
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        // En móvil se desliza en horizontal sin barra visible
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        mx: { xs: -2, md: 0 },
        px: { xs: 2, md: 0 },
        py: 0.25,
      }}
    >
      <Pildora activo={todos} onClick={() => onCambiar([])} oscuro={oscuro} etiqueta="Todos los odontólogos">
        <Box component="span" sx={{ pl: 1 }}>Todos</Box>
        <Contador n={total} />
      </Pildora>

      {dentists.map((d) => {
        const color = colorOdontologo(dentists, d.id);
        const activo = seleccion.includes(d.id);
        return (
          <Pildora
            key={d.id}
            activo={activo}
            color={color}
            oscuro={oscuro}
            onClick={() => alternar(d.id)}
            etiqueta={nombreOdontologo(d)}
          >
            <Box
              component="span"
              sx={{
                width: 28, height: 28, borderRadius: '50%',
                bgcolor: color, color: '#fff',
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700,
              }}
            >
              {activo ? <Check sx={{ fontSize: 16 }} /> : inicialesOdontologo(d)}
            </Box>
            <span>{nombreOdontologo(d)}</span>
            <Contador n={conteos[d.id] ?? 0} />
          </Pildora>
        );
      })}
    </Box>
  );
}
