import crypto from 'crypto';
import { env } from '../config/env';

// AES-256-GCM para cifrar secretos (API Key de Gemini) antes de guardarlos en DB.
// GEMINI_ENCRYPT_KEY: base64 de 32 bytes (openssl rand -base64 32)

function getKey(): Buffer {
  const key = Buffer.from(env.GEMINI_ENCRYPT_KEY, 'base64');
  if (key.length !== 32) {
    // fallback: derivar 32 bytes deterministas del valor provisto
    return crypto.createHash('sha256').update(env.GEMINI_ENCRYPT_KEY).digest();
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}
