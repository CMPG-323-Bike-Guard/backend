import { createHmac, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from './config';

export function newId(): string {
  return randomUUID();
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hmacIdentifier(rawUid: string): string {
  return createHmac('sha256', config.hmacSecret).update(rawUid.trim()).digest('hex');
}

export function displayRef(prefix: 'CRD' | 'BG', hmac: string): string {
  return `${prefix}-${hmac.slice(0, 6).toUpperCase()}`;
}
