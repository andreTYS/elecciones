interface AnomaliaInput {
  candidatos: { votos: number }[];
  nulos: number;
  blancos: number;
  confianzaGlobal: number;
  inconsistencias?: string[];
  totalVotantes?: number | null;
}

// Deteccion de anomalias en los resultados del OCR de un acta
export function detectarAnomalias(parsed: AnomaliaInput): string[] {
  const alertas: string[] = [];
  const totalValidos = parsed.candidatos.reduce((s, c) => s + (c.votos || 0), 0);
  const total = totalValidos + (parsed.nulos || 0) + (parsed.blancos || 0);

  if (total < 10) alertas.push('Total de votos muy bajo');
  if (total > 0 && parsed.nulos > total * 0.3) {
    alertas.push(`Nulos excesivos: ${Math.round((parsed.nulos / total) * 100)}%`);
  }
  if (parsed.confianzaGlobal < 0.8) alertas.push('Baja confianza global del OCR');
  if (parsed.totalVotantes && total !== parsed.totalVotantes) {
    alertas.push(`La suma (${total}) no coincide con el total de votantes (${parsed.totalVotantes})`);
  }
  for (const inc of parsed.inconsistencias ?? []) alertas.push(`Inconsistencia: ${inc}`);

  return alertas;
}
