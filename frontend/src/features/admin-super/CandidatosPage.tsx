import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { PageTitle } from '../../shared/components/icons';

interface Candidato { id: number; nombre: string; agrupacion: string; numero: number; color: string; activo: boolean }

export default function CandidatosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', agrupacion: '', numero: '', color: '#1B3A6B' });
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const { data } = useQuery({
    queryKey: ['candidatos'],
    queryFn: async () => (await api.get('/candidatos')).data.candidatos as Candidato[],
  });

  const crear = useMutation({
    mutationFn: () => api.post('/candidatos', {
      nombre: form.nombre, agrupacion: form.agrupacion, numero: Number(form.numero), color: form.color,
    }),
    onSuccess: () => {
      setMsg({ tipo: 'ok', texto: 'Candidato registrado correctamente' });
      setForm({ nombre: '', agrupacion: '', numero: '', color: '#1B3A6B' });
      qc.invalidateQueries({ queryKey: ['candidatos'] });
    },
    onError: (e: any) => setMsg({ tipo: 'error', texto: e.response?.data?.error || 'Error al registrar' }),
  });

  const desactivar = useMutation({
    mutationFn: (id: number) => api.delete(`/candidatos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos'] }),
  });

  const submit = (e: FormEvent) => { e.preventDefault(); crear.mutate(); };

  return (
    <div>
      <PageTitle icon="flag">Candidatos y Agrupaciones</PageTitle>

      <form className="tarjeta" onSubmit={submit}>
        <h3>Registrar candidato</h3>
        <div className="fila-form">
          <div><label>Nombre del candidato</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
          <div><label>Agrupación política</label><input value={form.agrupacion} onChange={(e) => setForm({ ...form, agrupacion: e.target.value })} required /></div>
          <div><label>Número en cédula</label><input type="number" min={1} value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required /></div>
          <div><label>Color</label><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
        </div>
        {msg && <div className={`alerta-msg ${msg.tipo === 'ok' ? 'alerta-ok' : 'alerta-error'}`}>{msg.texto}</div>}
        <div className="acciones"><button className="btn btn-oro" disabled={crear.isPending}>Registrar</button></div>
      </form>

      <div className="tarjeta tabla-scroll">
        <table>
          <thead><tr><th>N°</th><th>Candidato</th><th>Agrupación</th><th>Color</th><th></th></tr></thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td><b>{c.numero}</b></td>
                <td>{c.nombre}</td>
                <td style={{ color: 'var(--texto-2)' }}>{c.agrupacion}</td>
                <td><span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 6, background: `#${c.color}` }} /></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-rojo btn-sm" onClick={() => desactivar.mutate(c.id)}>Desactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
