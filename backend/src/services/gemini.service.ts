import { Candidato } from '@prisma/client';
import { prisma } from '../config/database';
import { decrypt, encrypt } from '../utils/crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { detectarAnomalias } from './alerta.service';

export const GEMINI_KEY_CLAVE = 'GEMINI_API_KEY';

export interface OCRCandidatoResult {
  nombre: string;
  agrupacion: string;
  votos: number;
  confianza: 'alta' | 'media' | 'baja';
}

export interface OCRResult {
  candidatos: OCRCandidatoResult[];
  nulos: number;
  blancos: number;
  totalVotantes: number | null;
  inconsistencias: string[];
  confianzaGlobal: number;
  observaciones: string | null;
  alertas: string[];
  error?: string;
}

// ── Gestion de la API Key (cifrada AES-256-GCM en ConfigSistema) ──────────

export async function setGeminiKey(apiKey: string): Promise<void> {
  const cifrada = encrypt(apiKey);
  await prisma.configSistema.upsert({
    where: { clave: GEMINI_KEY_CLAVE },
    create: { clave: GEMINI_KEY_CLAVE, valor: cifrada },
    update: { valor: cifrada },
  });
}

export async function hasGeminiKey(): Promise<boolean> {
  const row = await prisma.configSistema.findUnique({ where: { clave: GEMINI_KEY_CLAVE } });
  return !!row;
}

export async function deleteGeminiKey(): Promise<void> {
  await prisma.configSistema.deleteMany({ where: { clave: GEMINI_KEY_CLAVE } });
}

async function getGeminiKeyFromDB(): Promise<string | null> {
  const row = await prisma.configSistema.findUnique({ where: { clave: GEMINI_KEY_CLAVE } });
  if (!row) return null;
  try {
    return decrypt(row.valor);
  } catch (e) {
    logger.error(`No se pudo descifrar la API Key de Gemini: ${(e as Error).message}`);
    return null;
  }
}

// ── OCR del acta de escrutinio ─────────────────────────────────────────────

export async function procesarActa(imagenBase64: string, candidatos: Candidato[]): Promise<OCRResult> {
  const apiKey = await getGeminiKeyFromDB();
  if (!apiKey) throw new Error('API Key de Gemini no configurada. Contacta al Admin Super.');

  const nombresCandsStr = candidatos.map((c) => `${c.nombre} (${c.agrupacion}, N°${c.numero})`).join(', ');
  const prompt = `Eres experto en actas electorales peruanas ONPE. Analiza esta foto del ACTA DE ESCRUTINIO de Gobernador Regional de Moquegua, Peru 2026. Los candidatos registrados son: ${nombresCandsStr}. Extrae con precision los votos. Responde SOLO JSON sin markdown:
{
  "candidatos": [{"nombre": "nombre exacto del candidato","agrupacion": "agrupacion politica","votos": numero,"confianza": "alta|media|baja"}],
  "nulos": numero,
  "blancos": numero,
  "totalVotantes": numero_o_null,
  "inconsistencias": ["descripcion si la suma no cuadra"],
  "confianzaGlobal": 0.0_a_1.0,
  "observaciones": "texto_o_null"
}
Si no es un acta valida: {"error": "descripcion"}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    // API key en header, no en URL (evita fugas en logs de proxies)
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imagenBase64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(`Gemini API error ${response.status}: ${body.slice(0, 300)}`);
    throw new Error(`Gemini API respondió ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini no devolvió contenido');

  const text = rawText.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text) as Omit<OCRResult, 'alertas'>;

  if (parsed.error) {
    return { ...emptyOCR(), error: parsed.error };
  }

  const alertas = detectarAnomalias(parsed);
  return { ...parsed, alertas };
}

function emptyOCR(): OCRResult {
  return {
    candidatos: [],
    nulos: 0,
    blancos: 0,
    totalVotantes: null,
    inconsistencias: [],
    confianzaGlobal: 0,
    observaciones: null,
    alertas: [],
  };
}
