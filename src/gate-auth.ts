import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config';

export interface GatePayload {
  studentNumber?: string | null;
  tagUid?: string | null;
  ts?: number;
  sig?: string;
}

const lastAcceptedTs = new Map<string, number>();

export function gateKey(gateId: string): string {
  return createHmac('sha256', config.gateMasterSecret).update(gateId).digest('hex');
}

function canonical(gateId: string, ts: number, studentNumber?: string | null, tagUid?: string | null): string {
  return [gateId, ts, studentNumber ?? '', tagUid ?? ''].join('|');
}

export function signPayload(gateId: string, ts: number, studentNumber?: string | null, tagUid?: string | null): string {
  return createHmac('sha256', gateKey(gateId)).update(canonical(gateId, ts, studentNumber, tagUid)).digest('hex');
}

export function verifyPayload(gateId: string, payload: GatePayload, now = Date.now()): boolean {
  if (!config.gateSigningRequired) return true;
  if (typeof payload.ts !== 'number' || typeof payload.sig !== 'string') return false;
  if (Math.abs(now - payload.ts) > config.gateMaxSkewMs) return false;

  const expected = Buffer.from(signPayload(gateId, payload.ts, payload.studentNumber, payload.tagUid), 'hex');
  const given = Buffer.from(payload.sig, 'hex');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

  const previous = lastAcceptedTs.get(gateId) ?? 0;
  if (payload.ts <= previous) return false;
  lastAcceptedTs.set(gateId, payload.ts);
  return true;
}

export function resetGateAuthState(): void {
  lastAcceptedTs.clear();
}