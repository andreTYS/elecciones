import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { PageTitle } from '../../shared/components/icons';

interface Distrito { id: number; nombre: string }
interface Provincia { id: number; nombre: string; distritos: Distrito[] }
interface Region { id: number; nombre: string; provincias: Provincia[] }
interface ConteoItem { candidatoId: number; nombre: string; agrupacion: string; numero: number; color: string; votos: number }

export default function ConteoPage() {
  const [regionId, setRegionId] = useState('');
  const [provinciaId, setProvinciaId] = useState('');
  const [distritoId, setDistritoId] = useState('');
  const [centroId, setCentroId] = useState('');
  const [mesaId, setMesaId] = useState('');
  const [agrupacion, setAgrupacion] = useState('');

  const { data: geo } = useQuery({
    queryKey: ['geo'],
    queryFn: async () => (await api.get('/centros/geo')).data.regiones as Region[],
  });
  const { data: centros } = useQuery({
    queryKey: ['centros'],
    queryFn: async () => (await api.get('/centros')).data.centros as { id: number; nombre: string; distrito: { id: number } }[],
  });
  const { data: mesas } = useQuery({
    queryKey: ['mesas-conteo', centroId],
    enabled: !!centroId,
    queryFn: async () => (await api.get(`/mesas?centroId=${centroId}`)).data.mesas as { id: number; numero: string }[],
  });

  const params = new URLSearchParams();
  if (regionId) params.set('regionId', regionId);
  if (provinciaId) params.set('provinciaId', provinciaId);
  if (distritoId) params.set('distritoId', distritoId);
  if (centroId) params.set('centroId', centroId);
  if (mesaId) params.set('mesaId', mesaId);
  if (agrupacion) params.set('agrupacion', agrupacion);

  const { data: conteo } = useQuery({
    queryKey: ['conteo', params.toString()],
    queryFn: async () => (await api.get(`/metricas/conteo?${params}`)).data as
      { conteo: ConteoItem[]; nulos: number; blancos: number; actasConfirmadas: number },
    refetchInterval: 15000,
  });

  const region = geo?.find((r) => r.id === Number(regionId));
  const provincia = region?.provincias.find((p) => p.id === Number(provinciaId));
  const centrosFiltrados = (centros ?? []).filter((c) => !distritoId || c.distrito.id === Number(distritoId));
  const total = (conteo?.conteo ?? []).reduce((s, c) => s + c.votos, 0);

  return (
    <div>
      <PageTitle icon="tally">Conteo de Votos</PageTitle>
      <div className="tarjeta">
        <div className="fila-form">
          <div>
            <label>Región</label>
            <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setProvinciaId(''); setDistritoId(''); setCentroId(''); setMesaId(''); }}>
              <option value="">Todas</option>
              {(geo ?? []).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div>
            <label>Provincia</label>
            <select value={provinciaId} onChange={(e) => { setProvinciaId(e.target.value); setDistritoId(''); setCentroId(''); setMesaId(''); }}>
              <option value="">Todas</option>
              {(region?.provincias ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label>Distrito</label>
            <select value={distritoId} onChange={(e) => { setDistritoId(e.target.value); setCentroId(''); setMesaId(''); }}>
              <option value="">Todos</option>
              {(provincia?.distritos ?? []).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label>Local de votación</label>
            <select value={centroId} onChange={(e) => { setCentroId(e.target.value); setMesaId(''); }}>
              <option value="">Todos</option>
              {centrosFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label>Mesa</label>
            <select value={mesaId} onChange={(e) => setMesaId(e.target.value)} disabled={!centroId}>
              <option value="">Todas</option>
              {(mesas ?? []).map((m) => <option key={m.id} value={m.id}>Mesa {m.numero}</option>)}
            </select>
          </div>
          <div>
            <label>Agrupación política</label>
            <input placeholder="Filtrar por agrupación…" value={agrupacion} onChange={(e) => setAgrupacion(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="tarjeta">
        <p style={{ color: 'var(--texto-2)', marginBottom: 12 }}>
          {conteo?.actasConfirmadas ?? 0} actas confirmadas · {total} votos válidos · {conteo?.nulos ?? 0} nulos · {conteo?.blancos ?? 0} blancos
        </p>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>N°</th><th>Candidato</th><th>Agrupación</th><th>Votos</th><th>%</th></tr></thead>
            <tbody>
              {(conteo?.conteo ?? []).map((c) => (
                <tr key={c.candidatoId}>
                  <td><span className="chip" style={{ background: `#${c.color}33`, color: `#${c.color}` }}>{c.numero}</span></td>
                  <td>{c.nombre}</td>
                  <td style={{ color: 'var(--texto-2)' }}>{c.agrupacion}</td>
                  <td><b>{c.votos}</b></td>
                  <td>{total > 0 ? ((c.votos / total) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
