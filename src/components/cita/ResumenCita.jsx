// src/components/cita/ResumenCita.jsx
// ============================================================
// Resumen de la cita que se arma en vivo, campo de motivo y
// botón "Agendar cita". En escritorio es la barra inferior fija;
// en móvil es el último paso (`apilado`).
// ============================================================
import { Fragment } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import { horaCorta } from '../../utils/disponibilidad';
import { sumarMinutos } from '../../utils/fechas';
import { fechaLarga, nombreCompleto } from './comun';

export default function ResumenCita({
  paciente, fecha, hora, duracion, dentista, tratamiento,
  motivo, onMotivo, puedeAgendar, guardando, onAgendar, apilado = false,
}) {
  const fin = hora ? sumarMinutos(`${fecha}T${hora}:00`, duracion).slice(11, 16) : null;

  // Cada parte: [texto si está, texto atenuado si falta]
  const partes = [
    [paciente && nombreCompleto(paciente), 'Elige un paciente'],
    [hora && `${fechaLarga(fecha)}, ${horaCorta(hora)} a ${horaCorta(fin)}`, 'Elige un horario'],
    [dentista && `${dentista.first_name} ${dentista.last_name}`, 'Elige un odontólogo'],
    [tratamiento?.name, 'Elige un tratamiento'],
  ];

  const frase = (
    <Typography
      component="p"
      aria-live="polite"
      sx={{ fontSize: apilado ? 16 : 14, lineHeight: 1.6, color: 'text.primary', m: 0 }}
    >
      {partes.map(([valor, falta], i) => (
        <Fragment key={falta}>
          {i > 0 && (
            <Box component="span" sx={{ color: 'text.secondary', mx: 0.75 }} aria-hidden="true">·</Box>
          )}
          {valor ? (
            <Box component="span" sx={{ fontWeight: 600 }}>{valor}</Box>
          ) : (
            <Box component="span" sx={{ color: 'text.disabled' }}>{falta}</Box>
          )}
        </Fragment>
      ))}
    </Typography>
  );

  const campoMotivo = (
    <TextField
      label="Motivo (opcional)"
      size="small"
      fullWidth
      multiline={apilado}
      minRows={apilado ? 3 : undefined}
      value={motivo}
      onChange={(e) => onMotivo(e.target.value)}
      slotProps={{ htmlInput: { maxLength: 500 } }}
      disabled={guardando}
    />
  );

  const boton = (
    <Button
      variant="contained"
      onClick={onAgendar}
      disabled={!puedeAgendar || guardando}
      startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : null}
      sx={{ whiteSpace: 'nowrap', px: 3, flexShrink: 0, width: apilado ? '100%' : 'auto' }}
    >
      {guardando ? 'Agendando…' : 'Agendar cita'}
    </Button>
  );

  if (apilado) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>Confirmar</Typography>
          {frase}
        </Box>
        {campoMotivo}
        {boton}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
      {frase}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        {campoMotivo}
        {boton}
      </Box>
    </Box>
  );
}
