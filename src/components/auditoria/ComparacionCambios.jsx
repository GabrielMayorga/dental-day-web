// src/components/auditoria/ComparacionCambios.jsx
// ============================================================
// Detalle de una fila de auditoría: lo que había antes y lo que
// quedó después, lado a lado, con los campos que cambiaron
// resaltados. Si solo hay "después" (creación, consulta, login),
// se muestra ese único bloque.
//
// `apilado` cambia las columnas por bloques uno bajo otro (móvil).
// ============================================================
import { Box, Typography } from '@mui/material';
import { useColorMode } from '../../context/ThemeContext';
import { nombreCampo, formatValor, ordenarCampos } from '../../utils/auditoria';

const iguales = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Un valor; con `fondo` queda resaltado, con `tachado` además se tacha
const ValorBox = ({ children, fondo, tachado = false }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      px: fondo ? 0.75 : 0,
      py: fondo ? 0.1 : 0,
      borderRadius: '6px',
      background: fondo ?? 'transparent',
      textDecoration: tachado ? 'line-through' : 'none',
      textDecorationColor: 'rgba(220,38,38,0.6)',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
    }}
  >
    {children}
  </Box>
);

const ComparacionCambios = ({ log, apilado = false }) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  const antes   = log.old_values ?? null;
  const despues = log.new_values ?? null;

  // Tonos de resaltado: ámbar para la fila, rojo/verde para el valor
  const filaCambio  = isDark ? 'rgba(251,191,36,0.10)' : 'rgba(217,119,6,0.07)';
  const valorAntes  = isDark ? 'rgba(248,113,113,0.14)' : 'rgba(220,38,38,0.08)';
  const valorDespues = isDark ? 'rgba(52,211,153,0.14)' : 'rgba(29,158,117,0.10)';
  const borde = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(10,31,68,0.08)';

  // ── Sin valores: consultas de listados, logins correctos ────
  if (!antes && !despues) {
    return (
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
        Sin detalle adicional.
      </Typography>
    );
  }

  // ── Solo "después": un bloque con los datos registrados ─────
  if (!antes) {
    return (
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Datos registrados
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: apilado ? '1fr' : 'minmax(160px, 220px) 1fr',
            columnGap: 2,
            rowGap: apilado ? 0.25 : 0.75,
          }}
        >
          {ordenarCampos(Object.keys(despues)).map((campo) => (
            <Box key={campo} sx={{ display: 'contents' }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: apilado ? 0.75 : 0 }}>
                {nombreCampo(campo)}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.primary' }}>
                <ValorBox>{formatValor(campo, despues[campo])}</ValorBox>
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // ── Antes y después ─────────────────────────────────────────
  const campos = ordenarCampos(new Set([...Object.keys(antes), ...Object.keys(despues ?? {})]));

  if (apilado) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {campos.map((campo) => {
          const cambio = !iguales(antes[campo], despues?.[campo]);
          return (
            <Box
              key={campo}
              sx={{ borderRadius: '10px', p: 1, background: cambio ? filaCambio : 'transparent', border: `1px solid ${borde}` }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                {nombreCampo(campo)}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                Antes:{' '}
                <ValorBox fondo={cambio ? valorAntes : undefined} tachado={cambio}>
                  {formatValor(campo, antes[campo])}
                </ValorBox>
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.primary', mt: 0.5 }}>
                Después:{' '}
                <ValorBox fondo={cambio ? valorDespues : undefined}>
                  {formatValor(campo, despues?.[campo])}
                </ValorBox>
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  }

  const CABECERA_SX = {
    fontSize: 12, fontWeight: 600, color: 'text.secondary',
    textTransform: 'uppercase', letterSpacing: 0.4, pb: 0.75,
    borderBottom: `1px solid ${borde}`,
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 220px) 1fr 1fr',
        alignItems: 'stretch',
      }}
    >
      <Typography sx={CABECERA_SX}>Campo</Typography>
      <Typography sx={CABECERA_SX}>Antes</Typography>
      <Typography sx={CABECERA_SX}>Después</Typography>

      {campos.map((campo) => {
        const cambio = !iguales(antes[campo], despues?.[campo]);
        const celda = {
          fontSize: 13,
          py: 0.9,
          pr: 2,
          background: cambio ? filaCambio : 'transparent',
          borderBottom: `1px solid ${borde}`,
        };
        return (
          <Box key={campo} sx={{ display: 'contents' }}>
            <Typography sx={{ ...celda, pl: 1, color: 'text.secondary', fontWeight: cambio ? 600 : 400 }}>
              {nombreCampo(campo)}
            </Typography>
            <Typography sx={{ ...celda, color: 'text.secondary' }}>
              <ValorBox fondo={cambio ? valorAntes : undefined} tachado={cambio}>
                {formatValor(campo, antes[campo])}
              </ValorBox>
            </Typography>
            <Typography sx={{ ...celda, color: 'text.primary' }}>
              <ValorBox fondo={cambio ? valorDespues : undefined}>
                {formatValor(campo, despues?.[campo])}
              </ValorBox>
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default ComparacionCambios;
