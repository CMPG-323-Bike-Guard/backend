import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { signToken } from '../src/auth-plugin';
import { pool, query } from '../src/db';
import { usersRepo } from '../src/repositories/users.repo';
import { hmacIdentifier } from '../src/security';
import { makeBike, makeCard, makeGate, makeTag, makeUser, resetDb } from './helpers';

let app: FastifyInstance;
const prefix = '/api/v1';

async function tokenFor(userId: string): Promise<string> {
  const user = await usersRepo.findById(userId);
  return signToken(user!);
}

beforeEach(async () => {
  await resetDb();
  app = await buildApp();
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await pool.end();
});

describe('POST /cards', () => {
  it('lets an admin enrol a card and the new card then verifies at the gate', async () => {
    const adminId = await makeUser('90000001', 'admin');
    const studentId = await makeUser('30000010');
    const bikeId = await makeBike(studentId);
    await makeTag(bikeId, 'TAG-NEW');
    const gateId = await makeGate();
    const guardToken = await tokenFor(await makeUser('90000002', 'guard'));

    const res = await app.inject({
      method: 'POST',
      url: `${prefix}/cards`,
      headers: { authorization: `Bearer ${await tokenFor(adminId)}` },
      payload: { studentNumber: '30000010', cardUid: 'CARD-NEW' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().cardRef).toMatch(/^CRD-/);

    const sim = await app.inject({
      method: 'POST',
      url: `${prefix}/dev/simulate-crossing`,
      headers: { authorization: `Bearer ${guardToken}` },
      payload: { gateId, cardUid: 'CARD-NEW', tagUid: 'TAG-NEW' },
    });
    expect(sim.statusCode).toBe(200);
    expect(sim.json().gateShouldOpen).toBe(true);
  });

  it('refuses non-admins', async () => {
    const guardToken = await tokenFor(await makeUser('90000002', 'guard'));
    await makeUser('30000010');
    const res = await app.inject({
      method: 'POST',
      url: `${prefix}/cards`,
      headers: { authorization: `Bearer ${guardToken}` },
      payload: { studentNumber: '30000010', cardUid: 'CARD-NEW' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects a card that is already enrolled', async () => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    const a = await makeUser('30000010');
    await makeUser('30000011');
    await makeCard(a, 'CARD-TAKEN');
    const res = await app.inject({
      method: 'POST',
      url: `${prefix}/cards`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { studentNumber: '30000011', cardUid: 'CARD-TAKEN' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().field).toBe('cardUid');
  });

  it('asks for confirmation before replacing, then blocks the old card', async () => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    const student = await makeUser('30000010');
    await makeCard(student, 'CARD-OLD');
    const url = `${prefix}/cards`;
    const headers = { authorization: `Bearer ${adminToken}` };

    const refused = await app.inject({ method: 'POST', url, headers, payload: { studentNumber: '30000010', cardUid: 'CARD-NEW' } });
    expect(refused.statusCode).toBe(409);

    const replaced = await app.inject({
      method: 'POST',
      url,
      headers,
      payload: { studentNumber: '30000010', cardUid: 'CARD-NEW', replaceExisting: true },
    });
    expect(replaced.statusCode).toBe(201);
    const rows = await query<{ status: string }>('SELECT status FROM cards WHERE card_hmac = $1', [hmacIdentifier('CARD-OLD')]);
    expect(rows[0].status).toBe('blocked');
  });

  it('rejects an unknown student number', async () => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    const res = await app.inject({
      method: 'POST',
      url: `${prefix}/cards`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { studentNumber: '99999999', cardUid: 'CARD-NEW' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /auth/login rate limit', () => {
  it('returns 429 after too many attempts for the same account and still allows other accounts', async () => {
    await makeUser('30000010');
    await makeUser('30000011');
    const attempt = (studentStaffNumber: string, password: string) =>
      app.inject({ method: 'POST', url: `${prefix}/auth/login`, payload: { studentStaffNumber, password } });

    for (let i = 0; i < 3; i += 1) {
      expect((await attempt('30000010', 'wrong')).statusCode).toBe(401);
    }
    const blocked = await attempt('30000010', 'Password123!');
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().code).toBe('rate_limited');

    expect((await attempt('30000011', 'Password123!')).statusCode).toBe(200);
  });
});

describe('POST /dev/simulate-crossing', () => {
  it('does not debounce by default, so repeated taps in the emulator each create an event', async () => {
    const owner = await makeUser('30000010');
    await makeCard(owner, 'C1');
    const bike = await makeBike(owner);
    await makeTag(bike, 'T1');
    const gateId = await makeGate();
    const token = await tokenFor(await makeUser('90000002', 'guard'));
    const send = () =>
      app.inject({
        method: 'POST',
        url: `${prefix}/dev/simulate-crossing`,
        headers: { authorization: `Bearer ${token}` },
        payload: { gateId, cardUid: 'C1', tagUid: 'T1' },
      });
    const [a, b] = [await send(), await send()];
    expect(a.json().crossing.event.eventId).not.toBe(b.json().crossing.event.eventId);
  });
});