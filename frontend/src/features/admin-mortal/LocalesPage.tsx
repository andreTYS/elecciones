import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { PageTitle } from '../../shared/components/icons';

interface Centro {
  id: number; codigo: string; nombre: string; direccion: string | null;
  distrito: { nombre: string; provincia: { nombre: string } };
  coordinador: { id: number; nombre: string } | null;
  _count: { mesas: number };
}
interface Usuario { id: number; nombre: string; rol: string; activo: boolean }

export default function LocalesPage() {
  const qc = useQueryClient();
  const { data: centros } = useQuery({
    queryKey: ['centros'],
    queryFn: async () => (await api.get('/centros')).data.centros as Centro[],
  });
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data.users as Usuario[],
  });

  const asignar = useMutation({
    mutationFn: ({ centroId, coordinadorId }: { centroId: number; coordinadorId: number | null }) =>
      api.put(`/centros/${centroId}/coordinador`, { coordinadorId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['centros'] }),
  });

  const coordinadores = (users ?? []).filter((u) => u.rol === 'COORDINADOR' && u.activo);

  return (
    <div>
      <PageTitle icon="building">Locales de Votación</PageTitle>
      <p className="texto-2" style={{ marginBottom: 14 }}>Asigna cada local a un Coordinador bajo tu cargo.</p>
      <div className="tarjeta tabla-scroll">
        <table>
          <thead><tr><th>Código</th><th>Local</th><th>Distrito</th><th>Mesas</th><th>Coordinador asignado</th></tr></thead>
          <tbody>
            {(centros ?? []).map((c) => (
              <tr key={c.id}>
                <td style={{ color: 'var(--texto-2)' }}>{c.codigo}</td>
                <td><b>{c.nombre}</b></td>
                <td>{c.distrito.nombre} <span style={{ color: 'var(--texto-2)', fontSize: 12 }}>({c.distrito.provincia.nombre})</span></td>
                <td>{c._count.mesas}</td>
                <td>
                  <select
                    value={c.coordinador?.id ?? ''}
                    onChange={(e) => asignar.mutate({ centroId: c.id, coordinadorId: Number(e.target.value) || null })}
                  >
                    <option value="">— Sin asignar —</option>
                    {coordinadores.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
