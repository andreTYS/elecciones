import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

interface Usuario { id: number; nombre: string; rol: string; activo: boolean }
interface Cert { id: number; createdAt: string; user: { id: number; nombre: string } }

export default function CertificadosPage() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data.users as Usuario[],
  });
  const { data: certs } = useQuery({
    queryKey: ['certificados'],
    queryFn: async () => (await api.get('/certificados')).data.certificados as Cert[],
  });

  const emitir = useMutation({
    mutationFn: (userId: number) => api.post(`/certificados/${userId}`),
    onSuccess: () => { setMsg('✓ Certificado emitido'); qc.invalidateQueries({ queryKey: ['certificados'] }); },
    onError: (e: any) => setMsg(e.response?.data?.error || 'Error al emitir'),
  });

  const descargar = async (id: number) => {
    const res = await api.get(`/certificados/${id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificado-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const personeros = (users ?? []).filter((u) => u.rol === 'PERSONERO' && u.activo);

  return (
    <div>
      <h2>📜 Certificados de Participación</h2>
      {msg && <div className="alerta-msg alerta-ok">{msg}</div>}
      <div className="tarjeta">
        <h3 style={{ marginBottom: 10 }}>Emitir certificado</h3>
        <div className="tabla-scroll">
          <table>
            <tbody>
              {personeros.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-oro btn-sm" disabled={emitir.isPending} onClick={() => emitir.mutate(p.id)}>
                      Generar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="tarjeta">
        <h3 style={{ marginBottom: 10 }}>Emitidos</h3>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>Personero</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {(certs ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{c.user.nombre}</td>
                  <td style={{ color: 'var(--texto-2)' }}>{new Date(c.createdAt).toLocaleString('es-PE')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => descargar(c.id)}>⬇ Descargar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
