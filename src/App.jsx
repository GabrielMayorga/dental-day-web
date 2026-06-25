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
            {/* <Route path="/agenda" element={<AgendaPage />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
