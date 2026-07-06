import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

interface PanelRow {
  id: number; nombre: string; mesa: string | null;
  desayuno: string | null; almuerzo: string | null; cena: string | null;
}

function Celda({ hora }: { hora: string | null }) {
  return hora
    ? <span className="chip chip-verde">{new Date(hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
    : <span className="chip chip-gris">Pendiente</span>;
}

export default function AlimentacionPanelPage() {
  const { data } = useQuery({
    queryKey: ['alimentacion-panel'],
    queryFn: async () => (await api.get('/alimentacion/panel')).data.panel as PanelRow[],
    refetchInterval: 30000,
  });

  return (
    <div>
      <h2>🍽️ Panel de Alimentación</h2>
      <div className="tarjeta tabla-scroll">
        <table>
          <thead><tr><th>Personero</th><th>Mesa</th><th>Desayuno</th><th>Almuerzo</th><th>Cena</th></tr></thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td style={{ color: 'var(--texto-2)' }}>{p.mesa ?? '—'}</td>
                <td><Celda hora={p.desayuno} /></td>
                <td><Celda hora={p.almuerzo} /></td>
                <td><Celda hora={p.cena} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
