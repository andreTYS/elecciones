import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

interface Mesa {
  id: number;
  numero: string;
  estadoInstalada: boolean | null;
  horaConfirmacion: string | null;
  centroVotacion: { nombre: string; distrito: { nombre: string } };
}

export default function MesaPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['mesas'],
    queryFn: async () => (await api.get('/mesas')).data.mesas as Mesa[],
  });

  const confirmar = useMutation({
    mutationFn: ({ id, instalada }: { id: number; instalada: boolean }) =>
      api.put(`/mesas/${id}/estado`, { instalada }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mesas'] }),
  });

  if (isLoading) return <p>Cargando…</p>;
  const mesas = data ?? [];

  return (
    <div>
      <h2>🗳️ Mi Mesa</h2>
      {mesas.length === 0 && <div className="tarjeta">No tienes mesas asignadas. Contacta a tu coordinador.</div>}
      {mesas.map((m) => (
        <div className="tarjeta" key={m.id}>
          <h3>Mesa N° {m.numero}</h3>
          <p style={{ color: 'var(--texto-2)', margin: '6px 0' }}>
            {m.centroVotacion.nombre} — Distrito {m.centroVotacion.distrito.nombre}
          </p>
          <p style={{ margin: '10px 0' }}>
            Estado:{' '}
            {m.estadoInstalada === null ? (
              <span className="chip chip-gris">Sin confirmar</span>
            ) : m.estadoInstalada ? (
              <span className="chip chip-verde">INSTALADA ✓</span>
            ) : (
              <span className="chip chip-rojo">NO INSTALADA</span>
            )}
            {m.horaConfirmacion && (
              <span style={{ color: 'var(--texto-2)', fontSize: 13, marginLeft: 8 }}>
                {new Date(m.horaConfirmacion).toLocaleTimeString('es-PE')}
              </span>
            )}
          </p>
          <div className="acciones">
            <button className="btn btn-verde" disabled={confirmar.isPending}
              onClick={() => confirmar.mutate({ id: m.id, instalada: true })}>
              ✓ Mesa instalada
            </button>
            <button className="btn btn-rojo" disabled={confirmar.isPending}
              onClick={() => confirmar.mutate({ id: m.id, instalada: false })}>
              ✗ NO instalada
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
