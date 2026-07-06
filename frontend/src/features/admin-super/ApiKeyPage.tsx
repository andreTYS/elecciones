import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export default function ApiKeyPage() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const { data } = useQuery({
    queryKey: ['gemini-key'],
    queryFn: async () => (await api.get('/config/gemini-key')).data as { hasKey: boolean },
  });

  const guardar = useMutation({
    mutationFn: () => api.post('/config/gemini-key', { apiKey }),
    onSuccess: () => {
      setMsg({ tipo: 'ok', texto: '✓ API Key guardada (cifrada AES-256 en base de datos)' });
      setApiKey('');
      qc.invalidateQueries({ queryKey: ['gemini-key'] });
    },
    onError: (e: any) => setMsg({ tipo: 'error', texto: e.response?.data?.error || 'Error al guardar' }),
  });

  const eliminar = useMutation({
    mutationFn: () => api.delete('/config/gemini-key'),
    onSuccess: () => {
      setMsg({ tipo: 'ok', texto: 'API Key eliminada' });
      qc.invalidateQueries({ queryKey: ['gemini-key'] });
    },
  });

  const submit = (e: FormEvent) => { e.preventDefault(); guardar.mutate(); };

  return (
    <div>
      <h2>🔑 API Key de Google Gemini Vision</h2>
      <div className="alerta-msg alerta-error" style={{ marginBottom: 14 }}>
        🔒 Solo el Admin Super puede gestionar esta clave. Se guarda cifrada y NUNCA se muestra de vuelta.
      </div>

      <div className="tarjeta">
        <p style={{ marginBottom: 12 }}>
          Estado:{' '}
          {data?.hasKey
            ? <span className="chip chip-verde">✓ Configurada — OCR activo</span>
            : <span className="chip chip-rojo">Sin configurar — OCR deshabilitado</span>}
        </p>

        <form onSubmit={submit}>
          <label>{data?.hasKey ? 'Reemplazar API Key' : 'Ingresar API Key'}</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            minLength={20}
            required
            autoComplete="off"
          />
          {msg && <div className={`alerta-msg ${msg.tipo === 'ok' ? 'alerta-ok' : 'alerta-error'}`}>{msg.texto}</div>}
          <div className="acciones">
            <button className="btn btn-oro" disabled={guardar.isPending}>Guardar clave</button>
            {data?.hasKey && (
              <button type="button" className="btn btn-rojo" disabled={eliminar.isPending}
                onClick={() => { if (confirm('¿Eliminar la API Key? El OCR dejará de funcionar.')) eliminar.mutate(); }}>
                Eliminar clave
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
