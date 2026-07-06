import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { useSocketEvent } from '../../shared/hooks/useSocket';
import { Icon, PageTitle } from '../../shared/components/icons';

interface Stats {
  totalMesas: number; mesasInstaladas: number; totalActas: number; actasConfirmadas: number;
  pctAvance: number; incidenciasAbiertas: number; alertasAbiertas: number; totalVotos: number; personeros: number;
}
interface RankingItem { candidatoId: number; nombre: string; agrupacion: string; color: string; votos: number; pct: number }

export default function DashboardPage() {
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/metricas/dashboard')).data as Stats,
  });
  const { data: rankingData } = useQuery({
    queryKey: ['ranking'],
    queryFn: async () => (await api.get('/metricas/ranking')).data as { ranking: RankingItem[]; totalVotos: number },
  });

  // Actualizacion en tiempo real
  useSocketEvent('stats:update', () => {
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['ranking'] });
  });
  useSocketEvent('acta:confirmada', () => qc.invalidateQueries({ queryKey: ['ranking'] }));

  return (
    <div>
      <PageTitle icon="chart">Dashboard</PageTitle>
      <div className="grid-stats">
        <div className="stat"><div className="valor">{stats?.totalVotos ?? '—'}</div><div className="etiqueta">Votos contabilizados</div></div>
        <div className="stat"><div className="valor">{stats?.pctAvance ?? 0}%</div><div className="etiqueta">Avance de actas</div></div>
        <div className="stat"><div className="valor">{stats?.actasConfirmadas ?? '—'}/{stats?.totalMesas ?? '—'}</div><div className="etiqueta">Actas / Mesas</div></div>
        <div className="stat"><div className="valor">{stats?.mesasInstaladas ?? '—'}</div><div className="etiqueta">Mesas instaladas</div></div>
        <div className="stat"><div className="valor">{stats?.incidenciasAbiertas ?? '—'}</div><div className="etiqueta">Incidencias abiertas</div></div>
        <div className="stat"><div className="valor">{stats?.personeros ?? '—'}</div><div className="etiqueta">Personeros activos</div></div>
      </div>

      <div className="tarjeta">
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="trophy" size={17} style={{ color: 'var(--dorado-claro)' }} />
          Ranking de candidatos
          <span className="chip chip-verde" style={{ fontSize: 10.5 }}>EN VIVO</span>
        </h3>
        {(rankingData?.ranking ?? []).map((r) => (
          <div key={r.candidatoId} style={{ marginBottom: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
              <span><b>{r.nombre}</b> <span className="texto-2">— {r.agrupacion}</span></span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}><b>{r.votos}</b> <span className="texto-2">({r.pct}%)</span></span>
            </div>
            <div className="barra"><div style={{ width: `${r.pct}%`, background: `#${r.color}` }} /></div>
          </div>
        ))}
        {(!rankingData || rankingData.ranking.length === 0) && <p className="texto-2">Aún no hay votos confirmados.</p>}
      </div>
    </div>
  );
}
