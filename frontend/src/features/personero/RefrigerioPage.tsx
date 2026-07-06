import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

const COMIDAS = [
  { tipo: 'desayuno', label: '☕ Desayuno' },
  { tipo: 'almuerzo', label: '🍛 Almuerzo' },
  { tipo: 'cena', label: '🍲 Cena' },
] as const;

export default function RefrigerioPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['alimentacion'],
    queryFn: async () => (await api.get('/alimentacion')).data.registros as { tipo: string; hora: string }[],
  });

  const registrar = useMutation({
    mutationFn: (tipo: string) => api.post('/alimentacion', { tipo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alimentacion'] }),
  });

  const registros = data ?? [];

  return (
    <div>
      <h2>🍽️ Refrigerio</h2>
      <div className="tarjeta">
        <p style={{ color: 'var(--texto-2)', marginBottom: 12 }}>Registra cada comida al recibirla. La hora se guarda automáticamente.</p>
        {COMIDAS.map((c) => {
          const reg = registros.find((r) => r.tipo === c.tipo);
          return (
            <div key={c.tipo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--borde)' }}>
              <span style={{ fontSize: 16 }}>{c.label}</span>
              {reg ? (
                <span className="chip chip-verde">Recibido {new Date(reg.hora).toLocaleTimeString('es-PE')}</span>
              ) : (
                <button className="btn btn-oro btn-sm" disabled={registrar.isPending} onClick={() => registrar.mutate(c.tipo)}>
                  Registrar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
