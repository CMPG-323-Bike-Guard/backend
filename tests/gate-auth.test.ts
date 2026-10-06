import { beforeEach, describe, expect, it } from 'vitest';
import { gateKey, resetGateAuthState, signPayload, verifyPayload } from '../src/gate-auth';

const gateId = '11111111-1111-4111-8111-111111111111';
const now = 1_800_000_000_000;

beforeEach(() => resetGateAuthState());

function signed(ts: number, cardUid: string | null = 'C', tagUid: string | null = 'T') {
  return { cardUid, tagUid, ts, sig: signPayload(gateId, ts, cardUid, tagUid) };
}

describe('gate payload signing', () => {
  it('accepts a correctly signed, fresh payload', () => {
    expect(verifyPayload(gateId, signed(now), now)).toBe(true);
  });

  it('rejects unsigned payloads', () => {
    expect(verifyPayload(gateId, { cardUid: 'C', tagUid: 'T' }, now)).toBe(false);
  });

  it('rejects a payload whose contents were changed after signing', () => {
    const payload = { ...signed(now), tagUid: 'OTHER' };
    expect(verifyPayload(gateId, payload, now)).toBe(false);
  });

  it('rejects a signature made for a different gate', () => {
    const otherGate = '22222222-2222-4222-8222-222222222222';
    expect(verifyPayload(otherGate, signed(now), now)).toBe(false);
  });

  it('rejects stale and future timestamps', () => {
    expect(verifyPayload(gateId, signed(now - 60_000), now)).toBe(false);
    expect(verifyPayload(gateId, signed(now + 60_000), now)).toBe(false);
  });

  it('rejects a replay of an accepted message', () => {
    const payload = signed(now);
    expect(verifyPayload(gateId, payload, now)).toBe(true);
    expect(verifyPayload(gateId, payload, now + 1000)).toBe(false);
  });

  it('rejects a malformed signature without throwing', () => {
    expect(verifyPayload(gateId, { ...signed(now), sig: 'zz' }, now)).toBe(false);
  });

  it('derives a different key for every gate', () => {
    expect(gateKey(gateId)).not.toBe(gateKey('22222222-2222-4222-8222-222222222222'));
  });
});