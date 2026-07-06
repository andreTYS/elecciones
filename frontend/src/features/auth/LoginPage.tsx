import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore, Rol } from '../../shared/hooks/useAuth';

const TABS: { rol: Rol; label: string }[] = [
  { rol: 'PERSONERO', label: 'Personero' },
  { rol: 'COORDINADOR', label: 'Coordinador' },
  { rol: 'ADMIN_MORTAL', label: 'Admin Mortal' },
  { rol: 'SUPER_ADMIN', label: 'Admin Super' },
];

export default function LoginPage() {
  const [tab, setTab] = useState<Rol>('PERSONERO');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { username, password }, { withCredentials: true });
      if (data.user.rol !== tab) {
        setError(`Este usuario es ${data.user.rol.replace('_', ' ')}, selecciona la pestaña correcta`);
        setLoading(false);
        return;
      }
      setSession(data.accessToken, data.user);
      navigate('/');
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      setError(msg || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-caja" onSubmit={submit}>
        <h1>Voto<span>Control</span> Moquegua</h1>
        <p className="sub">Fiscalización Electoral — ERM 4 de octubre de 2026</p>

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.rol} type="button" className={tab === t.rol ? 'activo' : ''} onClick={() => setTab(t.rol)}>
              {t.label}
            </button>
          ))}
        </div>

        <label>Usuario</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

        {error && <div className="alerta-msg alerta-error">{error}</div>}

        <div className="acciones">
          <button className="btn btn-oro" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
      </form>
    </div>
  );
}
