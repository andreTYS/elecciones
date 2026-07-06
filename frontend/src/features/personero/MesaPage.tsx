import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { Icon, PageTitle } from '../../shared/components/icons';

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
      <PageTitle icon="ballot">Mi Mesa</PageTitle>
      {mesas.length === 0 && <div className="tarjeta">No tienes mesas asignadas. Contacta a tu coordinador.</div>}
      {mesas.map((m) => (
        <div className="tarjeta" key={m.id}>
          <h3>Mesa N° {m.numero}</h3>
          <p className="texto-2" style={{ margin: '6px 0' }}>
            {m.centroVotacion.nombre} — Distrito {m.centroVotacion.distrito.nombre}
          </p>
          <p style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Estado:{' '}
            {m.estadoInstalada === null ? (
              <span className="chip chip-gris">Sin confirmar</span>
            ) : m.estadoInstalada ? (
              <span className="chip chip-verde"><Icon name="check" size={13} />Instalada</span>
            ) : (
              <span className="chip chip-rojo"><Icon name="x" size={13} />No instalada</span>
            )}
            {m.horaConfirmacion && (
              <span className="texto-2" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="clock" size={13} />
                {new Date(m.horaConfirmacion).toLocaleTimeString('es-PE')}
              </span>
            )}
          </p>
          <div className="acciones">
            <button className="btn btn-verde" disabled={confirmar.isPending}
              onClick={() => confirmar.mutate({ id: m.id, instalada: true })}>
              <Icon name="check" size={16} /> Mesa instalada
            </button>
            <button className="btn btn-rojo" disabled={confirmar.isPending}
              onClick={() => confirmar.mutate({ id: m.id, instalada: false })}>
              <Icon name="x" size={16} /> No instalada
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
