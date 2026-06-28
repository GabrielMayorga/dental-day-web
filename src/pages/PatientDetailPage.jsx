// src/pages/PatientDetailPage.jsx
// ============================================================
// Pantalla de detalle de un paciente: datos personales e
// historia clínica (solo visible para admin y dentist).
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../context/ThemeContext';
import {
  Box, Typography, Button, Paper, Chip, Divider,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert,
} from '@mui/material';
import {
  ArrowBack, Phone, LocationCity, Cake, Person,
  Bloodtype, WarningAmber, Lock, AddCircle,
  LocalHospital, MedicalInformation,
} from '@mui/icons-material';
import { getPatient } from '../api/patients';
import { getPatientRecords, createPatientRecord } from '../api/clinicalRecords';
import { getDentists } from '../api/staff';

// ── Mapas de etiquetas ────────────────────────────────────────
const GENDER_LABEL = {
  male:              'Masculino',
  female:            'Femenino',
  other:             'Otro',
  prefer_not_to_say: 'Prefiero no decir',
};

// ── Helpers de formato ────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Estado vacío del formulario de registro ───────────────────
const EMPTY_RECORD = {
  staff_id:       '',
  chief_complaint: '',
  diagnosis:      '',
  treatment_plan: '',
  notes:          '',
};

// ── Subcomponente: fila de dato del paciente ──────────────────
const DataRow = ({ icon: Icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
    <Icon sx={{ color: '#2B7FD4', mt: 0.2, fontSize: 20, flexShrink: 0 }} />
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, mt: 0.3 }}>
        {value || '—'}
      </Typography>
    </Box>
  </Box>
);

// ── Subcomponente: campo de un registro clínico ───────────────
const RecordField = ({ label, value }) => (
  <Box>
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3, whiteSpace: 'pre-wrap' }}>
      {value}
    </Typography>
  </Box>
);

// ── Componente principal ──────────────────────────────────────
const PatientDetailPage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { mode }     = useColorMode();
  const isDark       = mode === 'dark';

  // Estilos glass adaptados al modo de color
  const glassBg     = isDark ? 'rgba(20, 28, 46, 0.65)' : 'rgba(255,255,255,0.65)';
  const glassBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.6)';
  const dialogBg    = isDark ? 'rgba(20, 28, 46, 0.92)' : 'rgba(255,255,255,0.92)';
  const dividerClr  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(28,100,173,0.08)';

  // Solo admin y dentist pueden ver la historia clínica
  const canViewHistory = user?.role === 'admin' || user?.role === 'dentist';

  // ── Estado: paciente ──────────────────────────────────────────
  const [patient,        setPatient]        = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [patientError,   setPatientError]   = useState('');

  // ── Estado: registros clínicos ────────────────────────────────
  const [records,        setRecords]        = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // ── Estado: lista de dentistas ────────────────────────────────
  const [dentists, setDentists] = useState([]);

  // ── Estado: diálogo de nuevo registro ────────────────────────
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [recordForm,  setRecordForm]  = useState(EMPTY_RECORD);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  // ── Carga del paciente ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingPatient(true);
      setPatientError('');
      try {
        const data = await getPatient(id);
        setPatient(data);
      } catch (err) {
        setPatientError(
          err.response?.data?.error ||
          err.response?.data?.message ||
          'No se pudo cargar el paciente'
        );
      } finally {
        setLoadingPatient(false);
      }
    };
    load();
  }, [id]);

  // ── Carga de registros (solo si tiene permiso) ────────────────
  const fetchRecords = useCallback(async () => {
    if (!canViewHistory) return;
    setLoadingRecords(true);
    try {
      const data = await getPatientRecords(id);
      // De más reciente a más antiguo
      const sorted = [...(data ?? [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setRecords(sorted);
    } finally {
      setLoadingRecords(false);
    }
  }, [id, canViewHistory]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Carga de dentistas para el formulario ─────────────────────
  useEffect(() => {
    if (!canViewHistory) return;
    getDentists()
      .then((data) => setDentists(data ?? []))
      .catch(() => {}); // silencioso; el select quedará vacío
  }, [canViewHistory]);

  // ── Manejo del formulario ─────────────────────────────────────
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setRecordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = () => {
    setRecordForm(EMPTY_RECORD);
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleSaveRecord = async () => {
    setFormError('');
    setSaving(true);
    try {
      // Omite campos vacíos para no enviar strings vacíos al backend
      const payload = Object.fromEntries(
        Object.entries(recordForm).filter(([, v]) => v !== '')
      );
      await createPatientRecord(id, payload);
      setDialogOpen(false);
      fetchRecords(); // refresca la lista tras guardar
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error al guardar el registro'
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render: cargando paciente ─────────────────────────────────
  if (loadingPatient) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress sx={{ color: '#1C64AD' }} />
      </Box>
    );
  }

  // ── Render: error al cargar paciente ─────────────────────────
  if (patientError) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/pacientes')}
          sx={{ mb: 2, color: 'text.secondary', borderRadius: '12px' }}
        >
          Volver
        </Button>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>{patientError}</Alert>
      </Box>
    );
  }

  // ── Render principal ──────────────────────────────────────────
  return (
    <Box>
      {/* Botón Volver */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/pacientes')}
        sx={{
          mb: 3,
          color: 'text.secondary',
          borderRadius: '12px',
          '&:hover': { background: 'rgba(28,100,173,0.07)' },
        }}
      >
        Volver a Pacientes
      </Button>

      {/* Nombre grande del paciente */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
          {patient.first_name} {patient.last_name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Expediente del paciente
        </Typography>
      </Box>

      {/* ── Tarjeta: datos personales ─────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: glassBorder,
          background: glassBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          p: 3,
          mb: 4,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 2.5 }}>
          Información personal
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          <DataRow icon={Phone}        label="Teléfono"            value={patient.phone} />
          <DataRow icon={LocationCity} label="Ciudad"              value={patient.city} />
          <DataRow icon={Cake}         label="Fecha de nacimiento" value={formatDate(patient.birth_date)} />
          <DataRow icon={Person}       label="Género"              value={GENDER_LABEL[patient.gender] || patient.gender} />
          <DataRow icon={Bloodtype}    label="Tipo de sangre"      value={patient.blood_type} />
          <DataRow icon={WarningAmber} label="Alergias"            value={patient.allergies} />
        </Box>
      </Paper>

      {/* ── Sección: Historia clínica ─────────────────────────── */}
      <Box>
        {/* Encabezado de sección */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MedicalInformation sx={{ color: '#2B7FD4', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Historia clínica
            </Typography>
          </Box>

          {canViewHistory && (
            <Button
              variant="contained"
              startIcon={<AddCircle />}
              onClick={handleOpenDialog}
              sx={{ borderRadius: '12px', px: 2.5 }}
            >
              Nuevo registro
            </Button>
          )}
        </Box>

        {/* Sin permiso (receptionist) */}
        {!canViewHistory && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: '20px',
              border: glassBorder,
              background: glassBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              p: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Lock sx={{ fontSize: 48, color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(28,100,173,0.15)' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Acceso restringido
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 360 }}>
              No tienes permiso para ver la historia clínica. Solo el personal médico
              (odontólogos y administradores) puede acceder a este contenido.
            </Typography>
          </Paper>
        )}

        {/* Cargando registros */}
        {canViewHistory && loadingRecords && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: '#1C64AD' }} />
          </Box>
        )}

        {/* Sin registros aún */}
        {canViewHistory && !loadingRecords && records.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: '20px',
              border: glassBorder,
              background: glassBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              p: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <LocalHospital sx={{ fontSize: 42, color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(28,100,173,0.15)' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Aún no hay registros clínicos para este paciente.
            </Typography>
          </Paper>
        )}

        {/* Lista de registros (más reciente primero) */}
        {canViewHistory && !loadingRecords && records.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {records.map((rec) => (
              <Paper
                key={rec.id}
                elevation={0}
                sx={{
                  borderRadius: '16px',
                  border: glassBorder,
                  background: glassBg,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  p: 3,
                }}
              >
                {/* Encabezado: fecha + nombre del odontólogo */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDateTime(rec.created_at)}
                  </Typography>
                  <Chip
                    label={rec.staff_name || 'Sin asignar'}
                    size="small"
                    sx={{
                      background: 'rgba(43,127,212,0.12)',
                      color: '#2B7FD4',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  />
                </Box>

                <Divider sx={{ mb: 2, borderColor: dividerClr }} />

                {/* Campos del registro (solo los que tienen valor) */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {rec.chief_complaint && (
                    <RecordField label="Motivo de consulta" value={rec.chief_complaint} />
                  )}
                  {rec.diagnosis && (
                    <RecordField label="Diagnóstico" value={rec.diagnosis} />
                  )}
                  {rec.treatment_plan && (
                    <RecordField label="Plan de tratamiento" value={rec.treatment_plan} />
                  )}
                  {rec.notes && (
                    <RecordField label="Notas adicionales" value={rec.notes} />
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* ── Diálogo: nuevo registro clínico ──────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: dialogBg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.45)'
              : '0 20px 60px rgba(20,60,110,0.2)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'text.primary', pb: 1 }}>
          Nuevo registro clínico
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>{formError}</Alert>
          )}

          {/* Selector de odontólogo */}
          <TextField
            select
            label="Odontólogo *"
            name="staff_id"
            value={recordForm.staff_id}
            onChange={handleFieldChange}
            size="small"
            fullWidth
          >
            {dentists.length === 0 ? (
              <MenuItem disabled value="">Cargando…</MenuItem>
            ) : (
              dentists.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.first_name} {d.last_name}
                </MenuItem>
              ))
            )}
          </TextField>

          <TextField
            label="Motivo de consulta *"
            name="chief_complaint"
            value={recordForm.chief_complaint}
            onChange={handleFieldChange}
            multiline
            rows={2}
            size="small"
            fullWidth
            placeholder="¿Por qué acude el paciente?"
          />

          <TextField
            label="Diagnóstico"
            name="diagnosis"
            value={recordForm.diagnosis}
            onChange={handleFieldChange}
            multiline
            rows={2}
            size="small"
            fullWidth
            placeholder="Hallazgos y diagnóstico clínico"
          />

          <TextField
            label="Plan de tratamiento"
            name="treatment_plan"
            value={recordForm.treatment_plan}
            onChange={handleFieldChange}
            multiline
            rows={2}
            size="small"
            fullWidth
            placeholder="Pasos del tratamiento propuesto"
          />

          <TextField
            label="Notas adicionales"
            name="notes"
            value={recordForm.notes}
            onChange={handleFieldChange}
            multiline
            rows={2}
            size="small"
            fullWidth
            placeholder="Observaciones, indicaciones, etc."
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            sx={{ borderRadius: '12px', color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRecord}
            disabled={saving || !recordForm.staff_id || !recordForm.chief_complaint}
            sx={{ borderRadius: '12px', minWidth: 120 }}
          >
            {saving
              ? <CircularProgress size={20} color="inherit" />
              : 'Guardar registro'
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientDetailPage;
