import { FormEvent, useState } from 'react';
import { api } from '../../shared/api/client';
import { Icon, PageTitle } from '../../shared/components/icons';

const TIPOS = ['Suplantación', 'Material incompleto', 'Coacción a votantes', 'Retraso en instalación', 'Problema con miembros de mesa', 'Otro'];

export default function IncidenciaPage() {
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [descripcion, setDescripcion] = useState('');
  const [severidad, setSeveridad] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      await api.post('/incidencias', { tipo, descripcion, severidad });
      setMsg({ tipo: 'ok', texto: 'Incidencia enviada a tu coordinador' });
      setDescripcion('');
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err.response?.data?.error || 'Error al enviar' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <PageTitle icon="alert">Reportar Incidencia</PageTitle>
      <p className="texto-2" style={{ marginBottom: 14, marginTop: -8 }}>
        Disponible en todo momento. Tu reporte llega de inmediato al coordinador a cargo.
      </p>
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
          <button className="btn btn-rojo" disabled={enviando}>
            <Icon name="send" size={15} /> {enviando ? 'Enviando…' : 'Enviar al coordinador'}
          </button>
        </div>
      </form>
    </div>
  );
}
