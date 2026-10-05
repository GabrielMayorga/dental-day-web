// src/components/Skeletons.jsx
// ============================================================
// Esqueletos de carga que imitan la forma del contenido real
// (filas de tabla, tarjetas, gráficos), en lugar de un spinner.
// El spinner queda solo para botones que envían formularios.
// ============================================================
import { Box, Paper, Skeleton, TableRow, TableCell } from '@mui/material';

// Anchos variados para que no parezca un bloque uniforme
const WIDTHS = ['70%', '55%', '40%', '62%', '48%'];

// Filas de tabla: se colocan dentro de un <TableBody>.
// `actions` agrega una última columna con íconos circulares.
export const TableRowsSkeleton = ({ rows = 5, cols, actions = 0 }) => (
  <>
    {Array.from({ length: rows }, (_, r) => (
      <TableRow key={r}>
        {Array.from({ length: cols }, (_, c) => (
          <TableCell key={c}>
            <Skeleton variant="text" width={WIDTHS[(r + c) % WIDTHS.length]} />
          </TableCell>
        ))}
        {actions > 0 && (
          <TableCell align="center">
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              {Array.from({ length: actions }, (_, i) => (
                <Skeleton key={i} variant="circular" width={28} height={28} />
              ))}
            </Box>
          </TableCell>
        )}
      </TableRow>
    ))}
  </>
);

// Tarjetas apiladas (listas móviles, grupos): una línea destacada
// y `lines` líneas secundarias por tarjeta.
export const CardListSkeleton = ({ count = 4, lines = 2, paperSx = {}, gap = 1.25 }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap }}>
    {Array.from({ length: count }, (_, i) => (
      <Paper key={i} elevation={0} sx={{ borderRadius: '14px', p: 1.75, ...paperSx }}>
        <Skeleton variant="text" width={WIDTHS[i % WIDTHS.length]} sx={{ fontSize: 16 }} />
        {Array.from({ length: lines }, (_, l) => (
          <Skeleton key={l} variant="text" width={WIDTHS[(i + l + 2) % WIDTHS.length]} sx={{ fontSize: 13 }} />
        ))}
      </Paper>
    ))}
  </Box>
);

// Filas de una lista dentro de una sola tarjeta (punto + dos líneas)
export const ListRowsSkeleton = ({ rows = 4, dot = true }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {Array.from({ length: rows }, (_, i) => (
      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, px: 1.5 }}>
        {dot && <Skeleton variant="circular" width={10} height={10} />}
        <Skeleton variant="text" width={44} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={WIDTHS[i % WIDTHS.length]} />
          <Skeleton variant="text" width="35%" sx={{ fontSize: 12 }} />
        </Box>
      </Box>
    ))}
  </Box>
);

// Tarjeta de indicador: número grande + etiqueta
export const KpiSkeleton = ({ paperSx = {} }) => (
  <Paper elevation={0} sx={{ borderRadius: '14px', p: { xs: 2, md: 3 }, ...paperSx }}>
    <Skeleton variant="text" width="45%" sx={{ fontSize: 34 }} />
    <Skeleton variant="text" width="60%" sx={{ fontSize: 13 }} />
  </Paper>
);

// Gráfico: título + área del gráfico
export const ChartSkeleton = ({ height = 260, paperSx = {} }) => (
  <Paper elevation={0} sx={{ borderRadius: '14px', p: { xs: 2, md: 3 }, ...paperSx }}>
    <Skeleton variant="text" width="40%" sx={{ fontSize: 18, mb: 1.5 }} />
    <Skeleton variant="rounded" height={height} sx={{ borderRadius: '10px' }} />
  </Paper>
);

// Calendario: barra de herramientas + cuadrícula de franjas horarias.
// `columns` = días visibles (7 en semana, 1 en vista de día).
export const CalendarSkeleton = ({ columns = 7, rows = 9 }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}>
      <Skeleton variant="rounded" width={96} height={34} sx={{ borderRadius: '10px' }} />
      <Skeleton variant="text" width={180} sx={{ fontSize: 20 }} />
      <Skeleton variant="rounded" width={columns > 1 ? 150 : 72} height={34} sx={{ borderRadius: '10px' }} />
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: `48px repeat(${columns}, 1fr)`, gap: 0.75 }}>
      <Box />
      {Array.from({ length: columns }, (_, c) => (
        <Skeleton key={`h${c}`} variant="text" sx={{ mx: 'auto', width: '60%' }} />
      ))}
      {Array.from({ length: rows }, (_, r) => [
        <Skeleton key={`t${r}`} variant="text" width={36} />,
        ...Array.from({ length: columns }, (_, c) => (
          <Skeleton key={`${r}-${c}`} variant="rounded" height={40} sx={{ borderRadius: '6px', opacity: 0.6 }} />
        )),
      ])}
    </Box>
  </Box>
);

// Ficha de detalle: título + bloque de datos en dos columnas
export const DetailSkeleton = ({ fields = 8, paperSx = {} }) => (
  <Box>
    <Skeleton variant="rounded" width={110} height={34} sx={{ borderRadius: '10px', mb: 2 }} />
    <Skeleton variant="text" width={260} sx={{ fontSize: 28 }} />
    <Skeleton variant="text" width={160} sx={{ fontSize: 14, mb: 3 }} />
    <Paper elevation={0} sx={{ borderRadius: '14px', p: { xs: 2, md: 3 }, ...paperSx }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {Array.from({ length: fields }, (_, i) => (
          <Box key={i}>
            <Skeleton variant="text" width="30%" sx={{ fontSize: 12 }} />
            <Skeleton variant="text" width={WIDTHS[i % WIDTHS.length]} />
          </Box>
        ))}
      </Box>
    </Paper>
  </Box>
);
