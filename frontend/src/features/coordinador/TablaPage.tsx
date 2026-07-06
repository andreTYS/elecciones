import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

interface ActaRow {
  id: number; confirmada: boolean; votosNulos: number; votosBlancos: number; createdAt: string;
  mesa: { numero: string; centroVotacion: { nombre: string } };
  personero: { nombre: string };
  votos: { votos: number; candidato: { nombre: string; numero: number } }[];
}

export default function TablaPage() {
  const { data } = useQuery({
    queryKey: ['actas'],
    queryFn: async () => (await api.get('/actas')).data.actas as ActaRow[],
  });

  const descargarCSV = async () => {
    const res = await api.get('/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `votocontrol-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2>📋 Tabla Completa</h2>
      <div className="acciones" style={{ marginBottom: 14 }}>
        <button className="btn btn-oro" onClick={descargarCSV}>⬇ Exportar CSV</button>
      </div>
      <div className="tarjeta tabla-scroll">
        <table>
          <thead>
            <tr><th>Mesa</th><th>Local</th><th>Personero</th><th>Estado</th><th>Votos por candidato</th><th>Nulos</th><th>Blancos</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td><b>{a.mesa.numero}</b></td>
                <td style={{ color: 'var(--texto-2)' }}>{a.mesa.centroVotacion.nombre}</td>
                <td>{a.personero.nombre}</td>
                <td>{a.confirmada ? <span className="chip chip-verde">Confirmada</span> : <span className="chip chip-oro">Pendiente</span>}</td>
                <td style={{ fontSize: 13 }}>
                  {a.votos.map((v) => `N°${v.candidato.numero}: ${v.votos}`).join(' · ') || '—'}
                </td>
                <td>{a.votosNulos}</td>
                <td>{a.votosBlancos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
