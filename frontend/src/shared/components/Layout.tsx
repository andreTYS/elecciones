import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRBAC } from '../hooks/useRBAC';
import { api } from '../api/client';
import { disconnectSocket } from '../hooks/useSocket';
import { Icon, IconName } from './icons';

const ROL_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Admin Super',
  ADMIN_MORTAL: 'Admin Mortal',
  COORDINADOR: 'Coordinador',
  PERSONERO: 'Personero',
};

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  minLevel: number;
  modulo?: string;
}

const NAV: { grupo: string; items: NavItem[] }[] = [
  {
    grupo: 'Personero',
    items: [
      { to: '/personero/mesa', label: 'Mi Mesa', icon: 'ballot', minLevel: 1 },
      { to: '/personero/acta', label: 'Acta de Escrutinio', icon: 'camera', minLevel: 1 },
      { to: '/personero/incidencias', label: 'Incidencias', icon: 'alert', minLevel: 1 },
      { to: '/personero/refrigerio', label: 'Refrigerio', icon: 'utensils', minLevel: 1 },
    ],
  },
  {
    grupo: 'Coordinador',
    items: [
      { to: '/coordinador/dashboard', label: 'Dashboard', icon: 'chart', minLevel: 2, modulo: 'dashboard' },
      { to: '/coordinador/conteo', label: 'Conteo de Votos', icon: 'tally', minLevel: 2, modulo: 'metricas' },
      { to: '/coordinador/incidencias', label: 'Incidencias Recibidas', icon: 'inbox', minLevel: 2, modulo: 'incidencias' },
      { to: '/coordinador/mesas', label: 'Mesas y Personeros', icon: 'clipboard', minLevel: 2, modulo: 'mesas' },
      { to: '/coordinador/alimentacion', label: 'Alimentación', icon: 'coffee', minLevel: 2, modulo: 'alimentacion' },
      { to: '/coordinador/certificados', label: 'Certificados', icon: 'award', minLevel: 2, modulo: 'certificados' },
      { to: '/coordinador/tabla', label: 'Tabla / CSV', icon: 'table', minLevel: 2, modulo: 'export' },
    ],
  },
  {
    grupo: 'Admin Mortal',
    items: [
      { to: '/admin/usuarios', label: 'Usuarios', icon: 'users', minLevel: 3, modulo: 'usuarios' },
      { to: '/admin/locales', label: 'Locales', icon: 'building', minLevel: 3, modulo: 'mesas' },
      { to: '/admin/urgencias', label: 'Urgencias', icon: 'megaphone', minLevel: 3, modulo: 'urgencias' },
    ],
  },
  {
    grupo: 'Admin Super',
    items: [
      { to: '/super/candidatos', label: 'Candidatos', icon: 'flag', minLevel: 4 },
      { to: '/super/apikey', label: 'API Key Gemini', icon: 'key', minLevel: 4 },
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
        <div className="marca">
          <span className="logo"><Icon name="shield" size={22} /></span>
          <div>
            <h1>Voto<span>Control</span></h1>
            <div className="sub">Moquegua 2026</div>
          </div>
        </div>
        <div className="rol-badge">
          <span className="punto" />
          <div>
            {user?.nombre}
            <small>{user ? ROL_LABEL[user.rol] : ''}</small>
          </div>
        </div>
        <nav>
          {NAV.map((g) => {
            const visibles = g.items.filter((i) => canAccess(i.minLevel) && (!i.modulo || hasModulo(i.modulo)));
            if (visibles.length === 0) return null;
            return (
              <div key={g.grupo}>
                <div className="grupo">{g.grupo}</div>
                {visibles.map((i) => (
                  <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'activo' : '')}>
                    <Icon name={i.icon} size={17} />
                    {i.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <button className="btn btn-ghost btn-sm" onClick={salir}>
          <Icon name="logout" size={15} />
          Cerrar sesión
        </button>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
