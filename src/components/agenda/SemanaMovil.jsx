// src/components/agenda/SemanaMovil.jsx
// ============================================================
// Tira de la semana para la vista de día en móvil, como la del
// Calendario del iPhone: los días hábiles de la semana en una
// fila; el día elegido va en un círculo, hoy se marca en rojo y
// un punto debajo indica que ese día tiene citas.
// ============================================================
import { Box, ButtonBase } from '@mui/material';
import { hoyLocal, sumarDias, parseFechaLocal, formatFecha } from '../../utils/fechas';
import { CLINICA } from '../../config/clinica';

const LETRAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const ROJO = '#FF3B30';

export default function SemanaMovil({ fecha, onElegir, diasConCitas, oscuro }) {
  // Lunes de la semana de `fecha` ('YYYY-MM-DD')
  const base = parseFechaLocal(fecha);
  const desdeLunes = (base.getDay() + 6) % 7;
  const lunes = sumarDias(fecha, -desdeLunes);
  const hoy = hoyLocal();

  const dias = [0, 1, 2, 3, 4, 5, 6]
    .map((i) => sumarDias(lunes, i))
    .filter((f) => CLINICA.horario.dias.includes(parseFechaLocal(f).getDay()));

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${dias.length}, 1fr)`, mb: 1.5 }}>
      {dias.map((f) => {
        const d = parseFechaLocal(f);
        const elegido = f === fecha;
        const esHoy = f === hoy;
        const fondo = elegido ? (esHoy ? ROJO : (oscuro ? '#E6EDF3' : '#0A1F44')) : 'transparent';
        const colorNum = elegido ? (esHoy || !oscuro ? '#fff' : '#0D1117') : (esHoy ? ROJO : 'text.primary');
        return (
          <ButtonBase
            key={f}
            onClick={() => onElegir(f)}
            aria-label={formatFecha(d, { weekday: 'long', day: 'numeric', month: 'long' })}
            aria-current={elegido ? 'date' : undefined}
            sx={{ flexDirection: 'column', gap: 0.5, py: 0.5, borderRadius: 2 }}
          >
            <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
              {LETRAS[d.getDay()]}
            </Box>
            <Box
              component="span"
              sx={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                bgcolor: fondo, color: colorNum,
                fontSize: 17, fontWeight: elegido || esHoy ? 700 : 500,
                transition: 'background-color 200ms ease',
              }}
            >
              {d.getDate()}
            </Box>
            <Box
              component="span"
              sx={{
                width: 5, height: 5, borderRadius: '50%',
                bgcolor: diasConCitas.has(f) ? 'text.secondary' : 'transparent',
                opacity: 0.6,
              }}
            />
          </ButtonBase>
        );
      })}
    </Box>
  );
}
