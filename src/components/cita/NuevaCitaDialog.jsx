// src/components/cita/NuevaCitaDialog.jsx
// ============================================================
// Diálogo de nueva cita: contenedor con el estado y el envío.
//
// - Escritorio: paciente a la izquierda, fecha y hora a la
//   derecha, resumen fijo abajo.
// - Móvil: pantalla completa en tres pasos
//   (Paciente → Fecha y hora → Confirmar).
//
// La disponibilidad sale de src/utils/disponibilidad.js con las
// citas del día del odontólogo. El estado se inicializa una vez
// por apertura: AgendaPage le cambia la `key` en cada apertura.
// ============================================================
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Divider,
  IconButton, Alert, Button, Stepper, Step, StepLabel, Typography,
  useTheme, useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { getAppointments, createAppointment } from '../../api/appointments';
import { getTreatments } from '../../api/treatments';
import { useAuth } from '../../context/AuthContext';
import { CLINICA } from '../../config/clinica';
import { aHoraLocal, parseFechaLocal, sumarDias } from '../../utils/fechas';
import { calcularHorarios, esDiaHabil } from '../../utils/disponibilidad';
import { mensajeError } from './comun';
import SelectorPaciente from './SelectorPaciente';
import SelectorHorario from './SelectorHorario';
import ResumenCita from './ResumenCita';

const { horario: HORARIO } = CLINICA;
const PASOS = ['Paciente', 'Fecha y hora', 'Confirmar'];

const fechaDe = (date) => aHoraLocal(date).slice(0, 10);

// Primer día de atención a partir de `fecha` (inclusive)
const diaHabilDesde = (fecha) => {
  let f = fecha;
  while (!esDiaHabil(f, HORARIO)) f = sumarDias(f, 1);
  return f;
};

/**
 * @param {object}   props.inicial  - { fecha?, hora?, staffId?, paciente?, motivo? }
 * @param {Function} props.onAgendada - ({ fecha, hora }) tras crear la cita
 */
export default function NuevaCitaDialog({ open, onClose, onAgendada, dentists = [], inicial = {} }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const { user } = useAuth();

  // Reloj: la cuadrícula oculta los horarios que van pasando
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setAhora(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, [open]);
  const hoy = fechaDe(ahora);

  // ── Estado del formulario ───────────────────────────────────
  // Día de arranque: el pedido (clic en el calendario) si no es pasado,
  // o hoy; si la clínica no atiende ese día, el siguiente hábil. La
  // hora pedida solo se conserva si el día no se movió.
  const [arranque] = useState(() => {
    const hoyIni = fechaDe(new Date());
    const pedida = inicial.fecha && inicial.fecha >= hoyIni ? inicial.fecha : hoyIni;
    const f = diaHabilDesde(pedida);
    return { fecha: f, hora: inicial.hora && f === inicial.fecha ? inicial.hora : null };
  });
  const [paciente, setPaciente] = useState(inicial.paciente ?? null);
  const [fecha, setFecha] = useState(arranque.fecha);
  const [hora, setHora] = useState(arranque.hora);
  const [staffElegido, setStaffElegido] = useState(inicial.staffId || null);
  const [treatmentId, setTreatmentId] = useState('');
  const [motivo, setMotivo] = useState(inicial.motivo ?? '');
  const [treatments, setTreatments] = useState([]);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [paso, setPaso] = useState(0);

  // Si quien usa el sistema es odontólogo, queda preseleccionado
  // (se empareja por email: /staff/dentists no trae user_id).
  const miDentista = user?.role === 'dentist'
    ? dentists.find((d) => d.email && d.email === user.email)
    : null;
  const staffId = staffElegido ?? miDentista?.id ?? '';
  const dentista = dentists.find((d) => String(d.id) === String(staffId)) ?? null;
  const tratamiento = treatments.find((t) => String(t.id) === String(treatmentId)) ?? null;
  const duracion = tratamiento?.duration_minutes ?? HORARIO.intervaloMinutos;

  useEffect(() => {
    getTreatments().then(setTreatments).catch(() => setTreatments([]));
  }, []);

  // ── Citas del día del odontólogo ────────────────────────────
  // `version` fuerza una recarga (tras un 409 o un reintento).
  const [version, setVersion] = useState(0);
  const [disp, setDisp] = useState({ clave: null, citas: [], error: '' });
  const clave = `${fecha}|${staffId}|${version}`;
  const cargando = Boolean(staffId) && disp.clave !== clave;

  useEffect(() => {
    if (!open || !staffId) return undefined;
    const controller = new AbortController();
    const claveActual = `${fecha}|${staffId}|${version}`;
    getAppointments(
      { from: `${fecha}T00:00:00`, to: `${sumarDias(fecha, 1)}T00:00:00` },
      { signal: controller.signal },
    )
      .then((citas) => setDisp({
        clave: claveActual,
        citas: citas.filter((c) => String(c.staff_id) === String(staffId)),
        error: '',
      }))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        setDisp({ clave: claveActual, citas: [], error: 'No se pudo cargar la disponibilidad.' });
      });
    return () => controller.abort();
  }, [open, fecha, staffId, version]);

  const citasDelDia = useMemo(() => (cargando ? [] : disp.citas), [cargando, disp.citas]);
  const horariosPara = (duracionMin) => calcularHorarios({
    fecha, duracionMin, citas: citasDelDia, ahora, horario: HORARIO,
  });
  const horarios = useMemo(
    () => calcularHorarios({ fecha, duracionMin: duracion, citas: citasDelDia, ahora, horario: HORARIO }),
    [fecha, duracion, citasDelDia, ahora],
  );

  // La hora elegida solo cuenta si sigue libre. Mientras carga se
  // conserva (la cuadrícula muestra el esqueleto y no se puede enviar).
  const estadoHora = horarios.find((h) => h.hora === hora)?.estado;
  const horaValida = hora && (cargando || estadoHora === 'libre') ? hora : null;

  // ── Handlers ────────────────────────────────────────────────
  const cambiarFecha = (f) => {
    setFecha(f);
    setHora(null);
    setAviso('');
  };

  const cambiarStaff = (id) => {
    setStaffElegido(id);
    setAviso('');
  };

  const elegirHora = (h) => {
    setHora(h);
    setAviso('');
    setError('');
  };

  // El tratamiento puede elegirse antes o después del horario; si
  // el horario elegido deja de alcanzar, se suelta y se avisa.
  const cambiarTratamiento = (id) => {
    setTreatmentId(id);
    const nuevo = treatments.find((t) => String(t.id) === String(id));
    if (!nuevo || !horaValida || cargando) return;
    const estado = horariosPara(nuevo.duration_minutes).find((h) => h.hora === horaValida)?.estado;
    if (estado !== 'libre') {
      setHora(null);
      setAviso('El horario elegido ya no alcanza para este tratamiento');
    }
  };

  // Tras crear un paciente el foco pasa a "Fecha y hora"
  const encabezadoHorario = useRef(null);
  const enfocarHorario = useRef(false);
  useEffect(() => {
    if (enfocarHorario.current && encabezadoHorario.current) {
      encabezadoHorario.current.focus();
      enfocarHorario.current = false;
    }
  });

  const pacienteCreado = (nuevo) => {
    setPaciente(nuevo);
    enfocarHorario.current = true;
    if (isMobile) setPaso(1);
  };

  const puedeAgendar = Boolean(paciente && staffId && tratamiento && horaValida && !cargando);
  const pasoCompleto = [Boolean(paciente), Boolean(staffId && tratamiento && horaValida && !cargando)];

  const cerrar = () => {
    if (!guardando) onClose();
  };

  const agendar = async () => {
    if (!puedeAgendar || guardando) return;
    setGuardando(true);
    setError('');
    try {
      await createAppointment({
        patient_id: paciente.id,
        staff_id: staffId,
        scheduled_at: aHoraLocal(parseFechaLocal(`${fecha}T${horaValida}`)),
        treatment_id: tratamiento.id,
        reason: motivo.trim() || undefined,
      });
      onAgendada({ fecha, hora: horaValida });
    } catch (err) {
      if (err.response?.status === 409) {
        // Otra persona ocupó el horario mientras tanto
        setError('Ese horario se acaba de ocupar. Elige otro.');
        setHora(null);
        setVersion((v) => v + 1);
        if (isMobile) setPaso(1);
      } else {
        setError(mensajeError(err, 'No se pudo agendar la cita. Inténtalo de nuevo.'));
      }
      setGuardando(false);
    }
  };

  // ── Piezas ──────────────────────────────────────────────────
  const selectorPaciente = (
    <Box>
      <Typography component="h3" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>Paciente</Typography>
      <SelectorPaciente paciente={paciente} onChange={setPaciente} onCreado={pacienteCreado} />
    </Box>
  );

  const selectorHorario = (
    <SelectorHorario
      ref={encabezadoHorario}
      hoy={hoy}
      fecha={fecha}
      onFecha={cambiarFecha}
      dentists={dentists}
      staffId={staffId}
      onStaff={cambiarStaff}
      treatments={treatments}
      treatmentId={treatmentId}
      onTreatment={cambiarTratamiento}
      horarios={horarios}
      hora={horaValida}
      onHora={elegirHora}
      cargando={cargando}
      errorCarga={disp.clave === clave ? disp.error : ''}
      onReintentar={() => setVersion((v) => v + 1)}
      aviso={aviso}
      grillaClave={`${clave}|${duracion}`}
    />
  );

  const resumen = (apilado) => (
    <ResumenCita
      paciente={paciente}
      fecha={fecha}
      hora={horaValida}
      duracion={duracion}
      dentista={dentista}
      tratamiento={tratamiento}
      motivo={motivo}
      onMotivo={setMotivo}
      puedeAgendar={puedeAgendar}
      guardando={guardando}
      onAgendar={agendar}
      apilado={apilado}
    />
  );

  const alertaError = error && (
    <Alert severity="error" sx={{ borderRadius: '14px', mb: 2 }} onClose={() => setError('')}>
      {error}
    </Alert>
  );

  const paperSx = {
    background: isDark ? 'rgba(22,27,34,0.92)' : 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(10,31,68,0.10)',
    borderRadius: { xs: 0, md: '14px' },
  };

  return (
    <Dialog
      open={open}
      onClose={cerrar}
      fullScreen={isMobile}
      fullWidth
      maxWidth="lg"
      aria-labelledby="nueva-cita-titulo"
      slotProps={{ paper: { sx: paperSx } }}
    >
      <DialogTitle
        id="nueva-cita-titulo"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: { xs: 17, md: 20 }, pb: 1 }}
      >
        Nueva cita
        <IconButton aria-label="Cerrar" onClick={cerrar} disabled={guardando} edge="end">
          <Close />
        </IconButton>
      </DialogTitle>

      {isMobile ? (
        <>
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Stepper activeStep={paso} alternativeLabel>
              {PASOS.map((p) => (
                <Step key={p}><StepLabel>{p}</StepLabel></Step>
              ))}
            </Stepper>
          </Box>
          <Divider />
          <DialogContent sx={{ px: 2, pt: 2 }}>
            {alertaError}
            {paso === 0 && selectorPaciente}
            {paso === 1 && selectorHorario}
            {paso === 2 && resumen(true)}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5, gap: 1, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={paso === 0 ? cerrar : () => setPaso((p) => p - 1)}
              disabled={guardando}
              sx={{ color: 'text.secondary', flex: 1 }}
            >
              {paso === 0 ? 'Cancelar' : 'Atrás'}
            </Button>
            {paso < 2 && (
              <Button
                variant="contained"
                onClick={() => setPaso((p) => p + 1)}
                disabled={!pasoCompleto[paso]}
                sx={{ flex: 1 }}
              >
                Siguiente
              </Button>
            )}
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent sx={{ px: 3, pt: 1 }}>
            {alertaError}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) auto 1fr', gap: 3 }}>
              {selectorPaciente}
              <Divider orientation="vertical" flexItem />
              {selectorHorario}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
            {resumen(false)}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
