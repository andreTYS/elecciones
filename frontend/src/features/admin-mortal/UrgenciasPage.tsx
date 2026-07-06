import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { useAuth } from '../../shared/hooks/useAuth';
import { useSocketEvent } from '../../shared/hooks/useSocket';

interface Urgencia { id: number; tipo: string; detalle: string; resuelta: boolean; createdAt: string }

export default function UrgenciasPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const esSuper = user?.rol === 'SUPER_ADMIN';
  const [tipo, setTipo] = useState('Operativo');
  const [detalle, setDetalle] = useState('');
  const [msg, setMsg] = useState('');

  const { data } = useQuery({
    queryKey: ['urgencias'],
    queryFn: async () => (await api.get('/urgencias')).data.urgencias as Urgencia[],
  });

  useSocketEvent('urgencia:nueva', () => qc.invalidateQueries({ queryKey: ['urgencias'] }));

  const crear = useMutation({
    mutationFn: () => api.post('/urgencias', { tipo, detalle }),
    onSuccess: () => { setMsg('✓ Reporte de urgencia enviado al Admin Super'); setDetalle(''); qc.invalidateQueries({ queryKey: ['urgencias'] }); },
    onError: (e: any) => setMsg(e.response?.data?.error || 'Error al enviar'),
  });

  const resolver = useMutation({
    mutationFn: (id: number) => api.put(`/urgencias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['urgencias'] }),
  });

  const submit = (e: FormEvent) => { e.preventDefault(); crear.mutate(); };

  return (
    <div>
      <h2>🚨 Reportes de Urgencia</h2>

      <form className="tarjeta" onSubmit={submit}>
        <h3>{esSuper ? 'Emitir urgencia' : 'Enviar urgencia al Admin Super'}</h3>
        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option>Operativo</option>
          <option>Seguridad</option>
          <option>Fraude potencial</option>
          <option>Logística</option>
          <option>Otro</option>
        </select>
        <label>Detalle</label>
        <textarea rows={3} value={detalle} onChange={(e) => setDetalle(e.target.value)} minLength={5} required />
        {msg && <div className="alerta-msg alerta-ok">{msg}</div>}
        <div className="acciones"><button className="btn btn-rojo" disabled={crear.isPending}>🚨 Enviar urgencia</button></div>
      </form>

      <div className="tarjeta">
        <h3 style={{ marginBottom: 10 }}>{esSuper ? 'Urgencias recibidas' : 'Mis urgencias enviadas'}</h3>
        {(data ?? []).length === 0 && <p style={{ color: 'var(--texto-2)' }}>Sin urgencias.</p>}
        {(data ?? []).map((u) => (
          <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borde)', opacity: u.resuelta ? 0.6 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <b>{u.tipo}</b>
                <span style={{ color: 'var(--texto-2)', fontSize: 13, marginLeft: 8 }}>
                  {new Date(u.createdAt).toLocaleString('es-PE')}
                </span>
              </div>
              {u.resuelta ? (
                <span className="chip chip-verde">Resuelta ✓</span>
              ) : esSuper ? (
                <button className="btn btn-verde btn-sm" onClick={() => resolver.mutate(u.id)}>Resolver</button>
              ) : (
                <span className="chip chip-oro">Pendiente</span>
              )}
            </div>
            <p style={{ marginTop: 6 }}>{u.detalle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
