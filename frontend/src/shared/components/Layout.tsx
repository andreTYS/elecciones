import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRBAC } from '../hooks/useRBAC';
import { api } from '../api/client';
import { disconnectSocket } from '../hooks/useSocket';

const ROL_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Admin Super',
  ADMIN_MORTAL: 'Admin Mortal',
  COORDINADOR: 'Coordinador',
  PERSONERO: 'Personero',
};

interface NavItem {
  to: string;
  label: string;
  minLevel: number;
  modulo?: string;
}

const NAV: { grupo: string; items: NavItem[] }[] = [
  {
    grupo: 'Personero',
    items: [
      { to: '/personero/mesa', label: '🗳️ Mi Mesa', minLevel: 1 },
      { to: '/personero/acta', label: '📸 Acta de Escrutinio', minLevel: 1 },
      { to: '/personero/incidencias', label: '⚠️ Incidencias', minLevel: 1 },
      { to: '/personero/refrigerio', label: '🍽️ Refrigerio', minLevel: 1 },
    ],
  },
  {
    grupo: 'Coordinador',
    items: [
      { to: '/coordinador/dashboard', label: '📊 Dashboard', minLevel: 2, modulo: 'dashboard' },
      { to: '/coordinador/conteo', label: '🔢 Conteo de Votos', minLevel: 2, modulo: 'metricas' },
      { to: '/coordinador/incidencias', label: '📩 Incidencias Recibidas', minLevel: 2, modulo: 'incidencias' },
      { to: '/coordinador/mesas', label: '🪑 Mesas y Personeros', minLevel: 2, modulo: 'mesas' },
      { to: '/coordinador/alimentacion', label: '🍽️ Alimentación', minLevel: 2, modulo: 'alimentacion' },
      { to: '/coordinador/certificados', label: '📜 Certificados', minLevel: 2, modulo: 'certificados' },
      { to: '/coordinador/tabla', label: '📋 Tabla / CSV', minLevel: 2, modulo: 'export' },
    ],
  },
  {
    grupo: 'Admin Mortal',
    items: [
      { to: '/admin/usuarios', label: '👥 Usuarios', minLevel: 3, modulo: 'usuarios' },
      { to: '/admin/locales', label: '🏫 Locales', minLevel: 3, modulo: 'mesas' },
      { to: '/admin/urgencias', label: '🚨 Urgencias', minLevel: 3, modulo: 'urgencias' },
    ],
  },
  {
    grupo: 'Admin Super',
    items: [
      { to: '/super/candidatos', label: '🎖️ Candidatos', minLevel: 4 },
      { to: '/super/apikey', label: '🔑 API Key Gemini', minLevel: 4 },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { canAccess, hasModulo } = useRBAC();
  const navigate = useNavigate();

  const salir = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Voto<span>Control</span></h1>
        <div className="rol-badge">{user ? ROL_LABEL[user.rol] : ''} · {user?.nombre}</div>
        <nav>
          {NAV.map((g) => {
            const visibles = g.items.filter((i) => canAccess(i.minLevel) && (!i.modulo || hasModulo(i.modulo)));
            if (visibles.length === 0) return null;
            return (
              <div key={g.grupo}>
                <div className="grupo">{g.grupo}</div>
                {visibles.map((i) => (
                  <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'activo' : '')}>
                    {i.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <button className="btn btn-ghost btn-sm" onClick={salir}>Cerrar sesión</button>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
