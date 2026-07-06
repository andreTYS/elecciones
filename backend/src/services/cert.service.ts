import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

interface CertData {
  nombrePersonero: string;
  dni?: string | null;
  mesa?: string;
  local?: string;
  emitidoPor: string;
}

/**
 * Genera el PDF del certificado de participacion y devuelve la ruta relativa.
 */
export async function generarCertificadoPDF(data: CertData): Promise<string> {
  const certsDir = path.join(env.UPLOAD_DIR, 'certs');
  fs.mkdirSync(certsDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.pdf`;
  const filepath = path.join(certsDir, filename);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Marco
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(2).stroke('#1B3A6B');
    doc.rect(38, 38, doc.page.width - 76, doc.page.height - 76).lineWidth(0.5).stroke('#C9920A');

    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#1B3A6B')
      .text('CERTIFICADO DE PARTICIPACIÓN', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(13).fillColor('#333')
      .text('VotoControl Moquegua 2026 — Fiscalización Electoral', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).text('Elecciones Regionales y Municipales — 4 de octubre de 2026', { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(13).text('Se otorga el presente certificado a:', { align: 'center' });
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#1B3A6B')
      .text(data.nombrePersonero.toUpperCase(), { align: 'center' });
    if (data.dni) {
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(12).fillColor('#333').text(`DNI: ${data.dni}`, { align: 'center' });
    }

    doc.moveDown(1);
    const detalle = [
      'Por su destacada labor como PERSONERO DE MESA',
      data.local ? `Local de votación: ${data.local}` : null,
      data.mesa ? `Mesa N° ${data.mesa}` : null,
    ].filter(Boolean).join('\n');
    doc.fontSize(12).text(detalle, { align: 'center' });

    doc.moveDown(2.5);
    doc.fontSize(11)
      .text(`Emitido por: ${data.emitidoPor}`, { align: 'center' })
      .text(`Fecha: ${new Date().toLocaleDateString('es-PE', { dateStyle: 'long' })}`, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return `certs/${filename}`;
}
