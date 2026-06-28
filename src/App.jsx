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
import ComingSoon from './components/ComingSoon';
import { MedicalServices, Receipt, Notifications, BarChart } from '@mui/icons-material';

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
            <Route path="/pacientes" element={<PatientsPage />} />
            <Route path="/pacientes/:id" element={<PatientDetailPage />} />
            <Route path="/agenda" element={<AgendaPage />} />

            <Route path="/historias" element={<ComingSoon title="Historias Clínicas" icon={MedicalServices} description="El expediente clínico y el odontograma digital estarán disponibles muy pronto." />} />
            <Route path="/facturacion" element={<ComingSoon title="Facturación" icon={Receipt} description="La gestión de pagos y comprobantes estará disponible muy pronto." />} />
            <Route path="/notificaciones" element={<ComingSoon title="Notificaciones" icon={Notifications} description="Los recordatorios automáticos de citas estarán disponibles muy pronto." />} />
            <Route path="/reportes" element={<ComingSoon title="Reportes" icon={BarChart} description="El panel de indicadores y reportes estará disponible muy pronto." />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
