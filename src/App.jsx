// src/App.jsx
// ============================================================
// Componente raíz: define las rutas de la aplicación.
// Las rutas privadas se renderizan DENTRO del Layout
// (barra lateral + cabecera), gracias al <Outlet/>.
// ============================================================
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AgendaPage from './pages/AgendaPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import RecordsPage from './pages/RecordsPage';
import InvoicesPage from './pages/InvoicesPage';
import { navItems } from './config/navigation';

// Roles permitidos para una ruta, tomados del menú (src/config/navigation.js)
const rolesFor = (path) => navItems.find((item) => item.path === path)?.roles;

// Facturación no está en el menú (ver navigation.js); se usan los roles
// de su entrada comentada para que la ruta no quede abierta a todos.
const INVOICE_ROLES = ['admin', 'receptionist'];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública (sin layout) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas privadas: todas dentro del Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/pacientes" element={<ProtectedRoute roles={rolesFor('/pacientes')}><PatientsPage /></ProtectedRoute>} />
            <Route path="/pacientes/:id" element={<ProtectedRoute roles={rolesFor('/pacientes')}><PatientDetailPage /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute roles={rolesFor('/agenda')}><AgendaPage /></ProtectedRoute>} />

            <Route path="/historias" element={<ProtectedRoute roles={rolesFor('/historias')}><RecordsPage /></ProtectedRoute>} />
            <Route path="/facturacion" element={<ProtectedRoute roles={INVOICE_ROLES}><InvoicesPage /></ProtectedRoute>} />
            <Route path="/notificaciones" element={<ProtectedRoute roles={rolesFor('/notificaciones')}><NotificationsPage /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute roles={rolesFor('/reportes')}><ReportsPage /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute roles={rolesFor('/usuarios')}><UsersPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
