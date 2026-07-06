import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { useAuth, ROLE_LEVEL, Rol } from '../../shared/hooks/useAuth';
import { PageTitle } from '../../shared/components/icons';

interface Usuario {
  id: number; nombre: string; dni: string | null; username: string; rol: Rol; activo: boolean;
  colorPartido: string | null; numeroPartido: number | null;
  distrito: { id: number; nombre: string } | null;
  supervisor: { id: number; nombre: string } | null;
  modulosPermitidos: string[] | null;
}

const ROL_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Admin Super', ADMIN_MORTAL: 'Admin Mortal', COORDINADOR: 'Coordinador', PERSONERO: 'Personero',
};

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { user: me, nivel } = useAuth();
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [editModulos, setEditModulos] = useState<Usuario | null>(null);

  const [form, setForm] = useState({
    nombre: '', dni: '', username: '', password: '', rol: 'PERSONERO' as Rol,
    colorPartido: '', numeroPartido: '', distritoId: '',
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data.users as Usuario[],
  });
  const { data: geo } = useQuery({
    queryKey: ['geo'],
    queryFn: async () => (await api.get('/centros/geo')).data.regiones as
      { provincias: { distritos: { id: number; nombre: string }[] }[] }[],
  });
  const { data: modCatalogo } = useQuery({
    queryKey: ['modulos-disponibles'],
    queryFn: async () => (await api.get('/users/modulos-disponibles')).data.modulos as string[],
  });

  const distritos = (geo ?? []).flatMap((r) => r.provincias.flatMap((p) => p.distritos));
  const rolesCreables = (Object.keys(ROLE_LEVEL) as Rol[]).filter((r) => ROLE_LEVEL[r] < nivel);

  const crear = useMutation({
    mutationFn: (payload: object) => api.post('/users', payload),
    onSuccess: () => {
      setMsg({ tipo: 'ok', texto: 'Usuario creado correctamente' });
      setForm({ nombre: '', dni: '', username: '', password: '', rol: 'PERSONERO', colorPartido: '', numeroPartido: '', distritoId: '' });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => setMsg({ tipo: 'error', texto: e.response?.data?.error || 'Error al crear' }),
  });

  const desactivar = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const guardarModulos = useMutation({
    mutationFn: ({ id, modulos }: { id: number; modulos: string[] }) => api.put(`/users/${id}/modulos`, { modulos }),
    onSuccess: () => { setEditModulos(null); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    crear.mutate({
      nombre: form.nombre,
      dni: form.dni || undefined,
      username: form.username,
      password: form.password,
      rol: form.rol,
      colorPartido: form.colorPartido || undefined,
      numeroPartido: form.numeroPartido ? Number(form.numeroPartido) : undefined,
      distritoId: form.distritoId ? Number(form.distritoId) : undefined,
    });
  };

  return (
    <div>
      <PageTitle icon="users">Gestión de Usuarios</PageTitle>

      <form className="tarjeta" onSubmit={submit}>
        <h3>Crear usuario</h3>
        <div className="fila-form">
          <div><label>Nombre completo</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
          <div><label>DNI</label><input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} pattern="\d{8}" title="8 dígitos" /></div>
          <div><label>Usuario</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
          <div><label>Contraseña</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></div>
          <div>
            <label>Rol</label>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
              {rolesCreables.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          </div>
          <div>
            <label>Distrito</label>
            <select value={form.distritoId} onChange={(e) => setForm({ ...form, distritoId: e.target.value })}>
              <option value="">—</option>
              {distritos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div><label>Color de partido</label><input type="color" value={form.colorPartido || '#1B3A6B'} onChange={(e) => setForm({ ...form, colorPartido: e.target.value })} /></div>
          <div><label>Número</label><input type="number" value={form.numeroPartido} onChange={(e) => setForm({ ...form, numeroPartido: e.target.value })} /></div>
        </div>
        {msg && <div className={`alerta-msg ${msg.tipo === 'ok' ? 'alerta-ok' : 'alerta-error'}`}>{msg.texto}</div>}
        <div className="acciones"><button className="btn btn-oro" disabled={crear.isPending}>Crear usuario</button></div>
      </form>

      <div className="tarjeta tabla-scroll">
        <table>
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Distrito</th><th>Supervisor</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td style={{ color: 'var(--texto-2)' }}>{u.username}</td>
                <td><span className="chip chip-oro">{ROL_LABEL[u.rol]}</span></td>
                <td>{u.distrito?.nombre ?? '—'}</td>
                <td style={{ color: 'var(--texto-2)' }}>{u.supervisor?.nombre ?? '—'}</td>
                <td>{u.activo ? <span className="chip chip-verde">Activo</span> : <span className="chip chip-rojo">Inactivo</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ROLE_LEVEL[u.rol] < nivel && u.id !== me?.id && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditModulos(u)}>Módulos</button>
                        {u.activo && (
                          <button className="btn btn-rojo btn-sm" onClick={() => desactivar.mutate(u.id)}>Desactivar</button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editModulos && (
        <div className="tarjeta" style={{ border: '2px solid var(--dorado)' }}>
          <h3>Módulos permitidos — {editModulos.nombre}</h3>
          <p style={{ color: 'var(--texto-2)', fontSize: 13, margin: '6px 0 12px' }}>
            Marca los módulos que este usuario puede usar (cascada de permisos).
          </p>
          <ModulosEditor
            catalogo={modCatalogo ?? []}
            inicial={(editModulos.modulosPermitidos as string[]) ?? []}
            onGuardar={(mods) => guardarModulos.mutate({ id: editModulos.id, modulos: mods })}
            onCancelar={() => setEditModulos(null)}
          />
        </div>
      )}
    </div>
  );
}

function ModulosEditor({ catalogo, inicial, onGuardar, onCancelar }: {
  catalogo: string[]; inicial: string[];
  onGuardar: (mods: string[]) => void; onCancelar: () => void;
}) {
  const [sel, setSel] = useState<string[]>(inicial);
  const toggle = (m: string) => setSel((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {catalogo.map((m) => (
          <button key={m} type="button" onClick={() => toggle(m)}
            className={`btn btn-sm ${sel.includes(m) ? 'btn-oro' : 'btn-ghost'}`}>
            {m}
          </button>
        ))}
      </div>
      <div className="acciones">
        <button className="btn btn-verde" onClick={() => onGuardar(sel)}>Guardar módulos</button>
        <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
