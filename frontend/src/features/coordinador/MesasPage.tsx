import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { useSocketEvent } from '../../shared/hooks/useSocket';

interface Mesa {
  id: number; numero: string; estadoInstalada: boolean | null;
  centroVotacion: { nombre: string };
  personero: { id: number; nombre: string } | null;
  actas: { id: number; confirmada: boolean }[];
}
interface Usuario { id: number; nombre: string; rol: string; activo: boolean }

export default function MesasPage() {
  const qc = useQueryClient();
  const { data: mesas } = useQuery({
    queryKey: ['mesas'],
    queryFn: async () => (await api.get('/mesas')).data.mesas as Mesa[],
  });
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data.users as Usuario[],
  });

  useSocketEvent('mesa:estado', () => qc.invalidateQueries({ queryKey: ['mesas'] }));

  const asignar = useMutation({
    mutationFn: ({ mesaId, personeroId }: { mesaId: number; personeroId: number | null }) =>
      api.put(`/mesas/${mesaId}/personero`, { personeroId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mesas'] }),
  });

  const personeros = (users ?? []).filter((u) => u.rol === 'PERSONERO' && u.activo);

  return (
    <div>
      <h2>🪑 Mesas y Personeros</h2>
      <div className="tarjeta tabla-scroll">
        <table>
          <thead><tr><th>Mesa</th><th>Local</th><th>Instalada</th><th>Acta</th><th>Personero asignado</th></tr></thead>
          <tbody>
            {(mesas ?? []).map((m) => (
              <tr key={m.id}>
                <td><b>{m.numero}</b></td>
                <td style={{ color: 'var(--texto-2)' }}>{m.centroVotacion.nombre}</td>
                <td>
                  {m.estadoInstalada === null ? <span className="chip chip-gris">—</span>
                    : m.estadoInstalada ? <span className="chip chip-verde">Sí</span>
                    : <span className="chip chip-rojo">No</span>}
                </td>
                <td>
                  {m.actas.some((a) => a.confirmada) ? <span className="chip chip-verde">Confirmada</span>
                    : m.actas.length > 0 ? <span className="chip chip-oro">En proceso</span>
                    : <span className="chip chip-gris">Pendiente</span>}
                </td>
                <td>
                  <select
                    value={m.personero?.id ?? ''}
                    onChange={(e) => asignar.mutate({ mesaId: m.id, personeroId: Number(e.target.value) || null })}
                  >
                    <option value="">— Sin asignar —</option>
                    {personeros.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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
