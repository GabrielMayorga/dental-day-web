// src/config/clinica.js
// ============================================================
// Datos de la clínica que se muestran en el login y en la
// pantalla de inicio. Los valores entre [corchetes] son
// marcadores pendientes: hay que reemplazarlos por los reales.
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

  horario: [
    { dias: '[Lunes a viernes]', horas: '[8:00 – 17:00]' },
    { dias: '[Sábado]',          horas: '[8:00 – 12:00]' },
  ],
};
