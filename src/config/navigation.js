// src/config/navigation.js
// ============================================================
// Lista de módulos del menú lateral. Separar esto facilita
// agregar/quitar secciones sin tocar el layout.
// El campo 'roles' controla qué roles ven cada módulo.
// ============================================================
import {
  CalendarMonth, People, MedicalServices, Receipt,
  Notifications, BarChart, Dashboard, AdminPanelSettings,
} from '@mui/icons-material';

export const navItems = [
  { label: 'Inicio',         path: '/',              icon: Dashboard,        roles: ['admin', 'dentist', 'receptionist'] },
  { label: 'Agenda',         path: '/agenda',        icon: CalendarMonth,    roles: ['admin', 'dentist', 'receptionist'] },
  { label: 'Pacientes',      path: '/pacientes',     icon: People,           roles: ['admin', 'dentist', 'receptionist'] },
  { label: 'Historias',      path: '/historias',     icon: MedicalServices,  roles: ['admin', 'dentist'] },
  { label: 'Facturación',    path: '/facturacion',   icon: Receipt,          roles: ['admin', 'receptionist'] },
  { label: 'Notificaciones', path: '/notificaciones', icon: Notifications,   roles: ['admin', 'receptionist'] },
  { label: 'Reportes',       path: '/reportes',      icon: BarChart,         roles: ['admin', 'dentist'] },
  { label: 'Usuarios', path: '/usuarios', icon: AdminPanelSettings, roles: ['admin'] },
];
