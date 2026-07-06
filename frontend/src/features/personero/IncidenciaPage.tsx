import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { Icon, PageTitle } from '../../shared/components/icons';

const TIPOS = ['Suplantación', 'Material incompleto', 'Coacción a votantes', 'Retraso en instalación', 'Problema con miembros de mesa', 'Otro'];

export default function IncidenciaPage() {
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [descripcion, setDescripcion] = useState('');
  const [severidad, setSeveridad] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const { data: actas } = useQuery({
    queryKey: ['actas'],
    queryFn: async () => (await api.get('/actas')).data.actas as { id: number; confirmada: boolean }[],
  });
  const tieneActaConfirmada = (actas ?? []).some((a) => a.confirmada);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/incidencias', { tipo, descripcion, severidad });
      setMsg({ tipo: 'ok', texto: 'Incidencia enviada a tu coordinador' });
      setDescripcion('');
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err.response?.data?.error || 'Error al enviar' });
    }
  };

  return (
    <div>
      <PageTitle icon="alert">Reportar Incidencia</PageTitle>
      {!tieneActaConfirmada && (
        <div className="alerta-msg alerta-error">
          <Icon name="lock" size={16} />
          El envío de incidencias se habilita después de confirmar tu acta de escrutinio.
        </div>
      )}
      <form className="tarjeta" onSubmit={enviar}>
        <label>Tipo de incidencia</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <label>Severidad</label>
        <select value={severidad} onChange={(e) => setSeveridad(e.target.value as typeof severidad)}>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </select>
        <label>Descripción</label>
        <textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} minLength={5} required />
        {msg && (
          <div className={`alerta-msg ${msg.tipo === 'ok' ? 'alerta-ok' : 'alerta-error'}`}>
            <Icon name={msg.tipo === 'ok' ? 'check' : 'alert'} size={16} />
            {msg.texto}
          </div>
        )}
        <div className="acciones">
          <button className="btn btn-rojo" disabled={!tieneActaConfirmada}>
            <Icon name="send" size={15} /> Enviar al coordinador
          </button>
        </div>
      </form>
    </div>
  );
}
