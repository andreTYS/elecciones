import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { Icon, PageTitle } from '../../shared/components/icons';

interface Candidato { id: number; nombre: string; agrupacion: string; numero: number; color: string }
interface VotoRow { candidatoId: number; votos: number }
interface ActaStatus {
  id: number;
  estadoOCR: string;
  confianzaOCR: number | null;
  votosNulos: number;
  votosBlancos: number;
  totalVotantes: number;
  confirmada: boolean;
  observaciones: string | null;
  votos: { candidatoId: number; votos: number; confianza: string; candidato: Candidato }[];
  alertas: { id: number; mensaje: string }[];
}

export default function ActaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mesaId, setMesaId] = useState<number | null>(null);
  const [actaId, setActaId] = useState<number | null>(null);
  const [votos, setVotos] = useState<VotoRow[]>([]);
  const [nulos, setNulos] = useState(0);
  const [blancos, setBlancos] = useState(0);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const { data: mesas } = useQuery({
    queryKey: ['mesas'],
    queryFn: async () => (await api.get('/mesas')).data.mesas as { id: number; numero: string; estadoInstalada: boolean | null }[],
  });

  const { data: candidatos } = useQuery({
    queryKey: ['candidatos'],
    queryFn: async () => (await api.get('/candidatos')).data.candidatos as Candidato[],
  });

  // Poll del estado OCR mientras procesa
  const { data: acta } = useQuery({
    queryKey: ['acta', actaId],
    enabled: !!actaId,
    refetchInterval: (q) => {
      const estado = (q.state.data as ActaStatus | undefined)?.estadoOCR;
      return estado === 'PENDIENTE' || estado === 'PROCESANDO' ? 2500 : false;
    },
    queryFn: async () => (await api.get(`/actas/${actaId}/status`)).data.acta as ActaStatus,
  });

  // Al terminar el OCR, precargar votos para revision
  useEffect(() => {
    if (!acta || !candidatos) return;
    if (acta.estadoOCR === 'COMPLETADO' || acta.estadoOCR === 'REQUIERE_REVISION') {
      setVotos(candidatos.map((c) => ({
        candidatoId: c.id,
        votos: acta.votos.find((v) => v.candidatoId === c.id)?.votos ?? 0,
      })));
      setNulos(acta.votosNulos);
      setBlancos(acta.votosBlancos);
    }
  }, [acta?.estadoOCR, candidatos]);

  const subir = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !mesaId) { setMsg({ tipo: 'error', texto: 'Selecciona mesa y foto del acta' }); return; }
    setSubiendo(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      fd.append('mesaId', String(mesaId));
      const { data } = await api.post('/actas/upload', fd);
      setActaId(data.actaId);
      setMsg({ tipo: 'ok', texto: 'Foto subida. Extrayendo votos con IA…' });
    } catch (e: any) {
      setMsg({ tipo: 'error', texto: e.response?.data?.error || 'Error al subir' });
    } finally {
      setSubiendo(false);
    }
  };

  const confirmarActa = async () => {
    if (!actaId) return;
    try {
      await api.put(`/actas/${actaId}/confirmar`, { votos, votosNulos: nulos, votosBlancos: blancos });
      setMsg({ tipo: 'ok', texto: 'Acta confirmada y enviada. Ya puedes reportar incidencias.' });
      qc.invalidateQueries({ queryKey: ['acta', actaId] });
    } catch (e: any) {
      setMsg({ tipo: 'error', texto: e.response?.data?.error || 'Error al confirmar' });
    }
  };

  const procesando = acta && (acta.estadoOCR === 'PENDIENTE' || acta.estadoOCR === 'PROCESANDO');
  const listoParaRevisar = acta && (acta.estadoOCR === 'COMPLETADO' || acta.estadoOCR === 'REQUIERE_REVISION') && !acta.confirmada;

  return (
    <div>
      <PageTitle icon="camera">Acta de Escrutinio</PageTitle>

      <div className="tarjeta">
        <label>Mesa</label>
        <select value={mesaId ?? ''} onChange={(e) => setMesaId(Number(e.target.value) || null)}>
          <option value="">— Selecciona tu mesa —</option>
          {(mesas ?? []).map((m) => (
            <option key={m.id} value={m.id}>Mesa {m.numero}{m.estadoInstalada !== true ? ' (sin instalar)' : ''}</option>
          ))}
        </select>
        <label>Fotografía del acta (JPG/PNG, máx. 15MB)</label>
        <input type="file" ref={fileRef} accept="image/jpeg,image/png" capture="environment" />
        <div className="acciones">
          <button className="btn btn-oro" onClick={subir} disabled={subiendo || !!procesando}>
            <Icon name="upload" size={16} />
            {subiendo ? 'Subiendo…' : 'Subir y extraer con IA'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alerta-msg ${msg.tipo === 'ok' ? 'alerta-ok' : 'alerta-error'}`}>
          <Icon name={msg.tipo === 'ok' ? 'check' : 'alert'} size={16} />
          {msg.texto}
        </div>
      )}

      {procesando && (
        <div className="tarjeta" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="refresh" size={18} style={{ color: 'var(--dorado-claro)' }} />
          Gemini AI está leyendo el acta… (estado: {acta!.estadoOCR})
        </div>
      )}
      {acta?.estadoOCR === 'ERROR' && (
        <div className="alerta-msg alerta-error">
          <Icon name="alert" size={16} />
          OCR falló: {acta.observaciones || 'error desconocido'}. Puedes reintentar la subida.
        </div>
      )}

      {listoParaRevisar && candidatos && (
        <div className="tarjeta">
          <h3>Revisar y corregir votos {acta!.confianzaOCR != null && `(confianza IA: ${Math.round(acta!.confianzaOCR * 100)}%)`}</h3>
          {acta!.alertas.length > 0 && (
            <div className="alerta-msg alerta-error">
              <Icon name="alert" size={16} />
              <div>{acta!.alertas.map((a) => <div key={a.id}>{a.mensaje}</div>)}</div>
            </div>
          )}
          <table>
            <thead><tr><th>N°</th><th>Candidato</th><th>Agrupación</th><th style={{ width: 110 }}>Votos</th></tr></thead>
            <tbody>
              {candidatos.map((c) => (
                <tr key={c.id}>
                  <td><span className="chip" style={{ background: `#${c.color}33`, color: `#${c.color}` }}>{c.numero}</span></td>
                  <td>{c.nombre}</td>
                  <td className="texto-2">{c.agrupacion}</td>
                  <td>
                    <input type="number" min={0}
                      value={votos.find((v) => v.candidatoId === c.id)?.votos ?? 0}
                      onChange={(e) => setVotos((prev) => prev.map((v) => v.candidatoId === c.id ? { ...v, votos: Number(e.target.value) } : v))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="fila-form" style={{ marginTop: 12 }}>
            <div><label>Votos nulos</label><input type="number" min={0} value={nulos} onChange={(e) => setNulos(Number(e.target.value))} /></div>
            <div><label>Votos en blanco</label><input type="number" min={0} value={blancos} onChange={(e) => setBlancos(Number(e.target.value))} /></div>
          </div>
          <div className="acciones">
            <button className="btn btn-verde" onClick={confirmarActa}>
              <Icon name="check" size={16} /> Confirmar acta
            </button>
          </div>
        </div>
      )}

      {acta?.confirmada && (
        <div className="alerta-msg alerta-ok">
          <Icon name="check" size={16} />
          Esta acta ya fue confirmada.
        </div>
      )}
    </div>
  );
}
