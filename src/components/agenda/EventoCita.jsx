// src/components/agenda/EventoCita.jsx
// ============================================================
// Contenido de cada cita dentro del calendario (eventContent de
// FullCalendar).
//
// Estilo Apple Calendar: relleno suave del color del estado, una
// barra sólida a la izquierda y el texto en un tono oscuro del
// mismo color. Así el calendario se lee como una lista ordenada y
// no como un mosaico de bloques saturados.
//
// La cantidad de texto se adapta al alto disponible: una cita de
// 30 min muestra solo el nombre; una de 45 min o más agrega la
// hora y el motivo.
// ============================================================
import { Box } from '@mui/material';
import { formatHora } from '../../utils/fechas';
import { tinta } from '../../utils/odontologos';

// Estados que ya no requieren acción: se atenúan, como los eventos
// pasados en Calendario.
const ATENUADOS = ['completed', 'cancelled', 'no_show'];

const Iniciales = ({ texto, color }) => (
  <Box
    component="span"
    className="cita-iniciales"
    aria-hidden
    sx={{
      flexShrink: 0,
      width: 18,
      height: 18,
      borderRadius: '50%',
      bgcolor: color,
      color: '#fff',
      fontSize: 9,
      fontWeight: 700,
      lineHeight: '18px',
      textAlign: 'center',
      letterSpacing: 0.2,
    }}
  >
    {texto}
  </Box>
);

export default function EventoCita({ arg, oscuro, odontologo }) {
  const { event, view } = arg;
  const ep = event.extendedProps;
  const color = ep.statusColor || '#3B82F6';
  const atenuado = ATENUADOS.includes(ep.status_name);
  const cancelado = ep.status_name === 'cancelled';
  const enConsulta = ep.status_name === 'in_progress';
  const hora = formatHora(event.start);

  // ── Vista de mes: una línea compacta con punto de color ──────
  if (view.type.startsWith('dayGrid')) {
    return (
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          width: '100%', minWidth: 0, px: 0.5,
          opacity: atenuado ? 0.55 : 1,
        }}
      >
        <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
        <Box component="span" sx={{ fontSize: 11.5, color: 'text.secondary', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {hora}
        </Box>
        <Box
          component="span"
          sx={{
            fontSize: 12, fontWeight: 600, color: 'text.primary',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: cancelado ? 'line-through' : 'none',
          }}
        >
          {ep.patient_name}
        </Box>
      </Box>
    );
  }

  // ── Vistas de semana y día ────────────────────────────────────
  const minutos = ep.duration_minutes || 30;
  const amplio = minutos >= 45;

  return (
    <Box
      className="cita"
      title={`${hora} · ${ep.patient_name}${ep.reason ? ` — ${ep.reason}` : ''} · ${ep.statusName}`}
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '7px',
        // Relleno opaco (mezclado con la superficie): la rejilla y la
        // línea de la hora actual no se ven a través del texto
        bgcolor: `color-mix(in srgb, ${color} ${oscuro ? 26 : 15}%, var(--cal-surface))`,
        borderLeft: `3px solid ${color}`,
        color: tinta(color, oscuro),
        px: 0.75,
        py: amplio ? 0.5 : 0.25,
        opacity: atenuado ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.125,
      }}
    >
      {/* Fila principal: nombre + iniciales del odontólogo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        {enConsulta && (
          <Box component="span" className="cita-pulso" aria-label="En consulta" sx={{ bgcolor: color }} />
        )}
        <Box
          component="span"
          className="cita-nombre"
          sx={{
            flex: 1, minWidth: 0,
            fontSize: 12.5, fontWeight: 600, lineHeight: 1.25,
            letterSpacing: '-0.005em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: cancelado ? 'line-through' : 'none',
          }}
        >
          {/* En citas cortas la hora va en línea, antes del nombre */}
          {!amplio && (
            <Box component="span" className="cita-hora" sx={{ fontWeight: 500, opacity: 0.75, mr: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {hora}
            </Box>
          )}
          {ep.patient_name}
        </Box>
        {odontologo && <Iniciales texto={odontologo.iniciales} color={odontologo.color} />}
      </Box>

      {/* Segunda línea solo si hay alto para leerla */}
      {amplio && (
        <Box
          component="span"
          className="cita-detalle"
          sx={{
            fontSize: 11.5, lineHeight: 1.3, opacity: 0.8,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {hora}{ep.reason ? ` · ${ep.reason}` : ''}
        </Box>
      )}
    </Box>
  );
}
