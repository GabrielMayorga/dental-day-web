// src/config/clinica.js
// ============================================================
// Datos de la clínica que se muestran en el login y en la
// pantalla de inicio. `horario` alimenta además la cuadrícula
// de disponibilidad al crear citas (src/utils/disponibilidad.js).
// ============================================================

export const CLINICA = {
  nombre: 'Clínica Dental Day',
  lema: 'Especialidades Dentales',

  // href en formato internacional; `visible` es lo que se muestra
  telefono: {
    visible: '+505 8271 1374',
    href: 'tel:+50582711374',
  },
  whatsapp: {
    visible: '+505 8271 1374',
    url: 'https://wa.me/50582711374',
  },

  direccion: 'De veterinaria Estrada, 1/2 al Norte. Contiguo a ferretería San Isidro',
  ciudad: 'Rama, RACCS, Nicaragua',

  // Horario de atención estructurado (hora de pared de la clínica)
  horario: {
    dias: [1, 2, 3, 4, 5, 6],   // lunes a sábado (0 = domingo)
    apertura: '08:00',
    cierre: '17:00',
    intervaloMinutos: 30,
  },
  horarioTexto: 'Lunes a sábado, 8:00 a 17:00',
};
