import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { Icon, IconName, PageTitle } from '../../shared/components/icons';

const COMIDAS: { tipo: string; label: string; icon: IconName }[] = [
  { tipo: 'desayuno', label: 'Desayuno', icon: 'coffee' },
  { tipo: 'almuerzo', label: 'Almuerzo', icon: 'utensils' },
  { tipo: 'cena', label: 'Cena', icon: 'bowl' },
];

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
      <PageTitle icon="utensils">Refrigerio</PageTitle>
      <div className="tarjeta">
        <p className="texto-2" style={{ marginBottom: 6 }}>
          Registra cada comida al recibirla. La hora se guarda automáticamente.
        </p>
        {COMIDAS.map((c) => {
          const reg = registros.find((r) => r.tipo === c.tipo);
          return (
            <div key={c.tipo} className="fila-item">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 550 }}>
                <Icon name={c.icon} size={19} style={{ color: 'var(--dorado-claro)' }} />
                {c.label}
              </span>
              {reg ? (
                <span className="chip chip-verde">
                  <Icon name="check" size={13} />
                  Recibido {new Date(reg.hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
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
