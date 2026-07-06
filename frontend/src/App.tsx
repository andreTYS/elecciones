import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './shared/hooks/useAuth';
import Layout from './shared/components/Layout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';

import MesaPage from './features/personero/MesaPage';
import ActaPage from './features/personero/ActaPage';
import IncidenciaPage from './features/personero/IncidenciaPage';
import RefrigerioPage from './features/personero/RefrigerioPage';

import DashboardPage from './features/coordinador/DashboardPage';
import ConteoPage from './features/coordinador/ConteoPage';
import IncidenciasRecibidasPage from './features/coordinador/IncidenciasRecibidasPage';
import MesasPage from './features/coordinador/MesasPage';
import AlimentacionPanelPage from './features/coordinador/AlimentacionPanelPage';
import CertificadosPage from './features/coordinador/CertificadosPage';
import TablaPage from './features/coordinador/TablaPage';

import UsuariosPage from './features/admin-mortal/UsuariosPage';
import LocalesPage from './features/admin-mortal/LocalesPage';
import UrgenciasPage from './features/admin-mortal/UrgenciasPage';

import CandidatosPage from './features/admin-super/CandidatosPage';
import ApiKeyPage from './features/admin-super/ApiKeyPage';

function HomeRedirect() {
  const { nivel } = useAuth();
  if (nivel >= 2) return <Navigate to="/coordinador/dashboard" replace />;
  return <Navigate to="/personero/mesa" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<HomeRedirect />} />

            {/* Personero (nivel 1) — accesible por todos en cascada */}
            <Route path="/personero/mesa" element={<MesaPage />} />
            <Route path="/personero/acta" element={<ActaPage />} />
            <Route path="/personero/incidencias" element={<IncidenciaPage />} />
            <Route path="/personero/refrigerio" element={<RefrigerioPage />} />

            {/* Coordinador (nivel 2+) */}
            <Route element={<ProtectedRoute minLevel={2} />}>
              <Route path="/coordinador/dashboard" element={<DashboardPage />} />
              <Route path="/coordinador/conteo" element={<ConteoPage />} />
              <Route path="/coordinador/incidencias" element={<IncidenciasRecibidasPage />} />
              <Route path="/coordinador/mesas" element={<MesasPage />} />
              <Route path="/coordinador/alimentacion" element={<AlimentacionPanelPage />} />
              <Route path="/coordinador/certificados" element={<CertificadosPage />} />
              <Route path="/coordinador/tabla" element={<TablaPage />} />
            </Route>

            {/* Admin Mortal (nivel 3+) */}
            <Route element={<ProtectedRoute minLevel={3} />}>
              <Route path="/admin/usuarios" element={<UsuariosPage />} />
              <Route path="/admin/locales" element={<LocalesPage />} />
              <Route path="/admin/urgencias" element={<UrgenciasPage />} />
            </Route>

            {/* Admin Super (nivel 4) */}
            <Route element={<ProtectedRoute minLevel={4} />}>
              <Route path="/super/candidatos" element={<CandidatosPage />} />
              <Route path="/super/apikey" element={<ApiKeyPage />} />
            </Route>

            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
