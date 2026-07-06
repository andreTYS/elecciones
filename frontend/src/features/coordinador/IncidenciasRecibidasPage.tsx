import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { useSocketEvent } from '../../shared/hooks/useSocket';

interface Incidencia {
  id: number; tipo: string; descripcion: string; severidad: 'ALTA' | 'MEDIA' | 'BAJA';
  resuelta: boolean; createdAt: string;
  personero: { nombre: string };
}

const SEV_CHIP = { ALTA: 'chip-rojo', MEDIA: 'chip-oro', BAJA: 'chip-verde' } as const;

export default function IncidenciasRecibidasPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['incidencias'],
    queryFn: async () => (await api.get('/incidencias')).data.incidencias as Incidencia[],
  });

  useSocketEvent('incidencia:nueva', () => qc.invalidateQueries({ queryKey: ['incidencias'] }));

  const resolver = useMutation({
    mutationFn: (id: number) => api.put(`/incidencias/${id}/resolver`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
  });

  return (
    <div>
      <h2>📩 Incidencias Recibidas</h2>
      {(data ?? []).length === 0 && <div className="tarjeta">Sin incidencias reportadas.</div>}
      {(data ?? []).map((i) => (
        <div className="tarjeta" key={i.id} style={{ opacity: i.resuelta ? 0.6 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span className={`chip ${SEV_CHIP[i.severidad]}`}>{i.severidad}</span>{' '}
              <b>{i.tipo}</b>
              <span style={{ color: 'var(--texto-2)', fontSize: 13, marginLeft: 8 }}>
                {i.personero.nombre} · {new Date(i.createdAt).toLocaleTimeString('es-PE')}
              </span>
            </div>
            {i.resuelta ? (
              <span className="chip chip-verde">Resuelta ✓</span>
            ) : (
              <button className="btn btn-verde btn-sm" onClick={() => resolver.mutate(i.id)}>Marcar resuelta</button>
            )}
          </div>
          <p style={{ marginTop: 8 }}>{i.descripcion}</p>
        </div>
      ))}
    </div>
  );
}
