import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { signToken } from '../src/auth-plugin';
import { pool, query } from '../src/db';
import { usersRepo } from '../src/repositories/users.repo';
import { makeBike, makeGate, makeTag, makeUser, resetDb } from './helpers';

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

describe('POST /users', () => {
  const valid = {
    studentStaffNumber: '31000001',
    name: 'Naledi Khumalo',
    email: 'Naledi@Test.NWU.ac.za',
    role: 'student',
    password: 'Welcome123!',
  };

  const create = (token: string | null, payload: object) =>
    app.inject({
      method: 'POST',
      url: `${prefix}/users`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload,
    });

  it('lets an admin add a person, who can then sign in', async () => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    const res = await create(adminToken, valid);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      studentStaffNumber: '31000001',
      name: 'Naledi Khumalo',
      email: 'naledi@test.nwu.ac.za',
      role: 'student',
      accountStatus: 'active',
    });
    expect(res.json()).not.toHaveProperty('passwordHash');

    const login = await app.inject({
      method: 'POST',
      url: `${prefix}/auth/login`,
      payload: { studentStaffNumber: '31000001', password: 'Welcome123!' },
    });
    expect(login.statusCode).toBe(200);

    const audit = await query<{ action: string }>("SELECT action FROM audit_log WHERE action = 'user.created'");
    expect(audit).toHaveLength(1);
  });

  it('can add a guard', async () => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    const res = await create(adminToken, { ...valid, role: 'guard' });
    expect(res.statusCode).toBe(201);
    expect(res.json().role).toBe('guard');
  });

  it('refuses guards and students, and unauthenticated requests', async () => {
    const guardToken = await tokenFor(await makeUser('90000002', 'guard'));
    const studentToken = await tokenFor(await makeUser('30000010'));
    expect((await create(guardToken, valid)).statusCode).toBe(403);
    expect((await create(studentToken, valid)).statusCode).toBe(403);
    expect((await create(null, valid)).statusCode).toBe(401);
  });

  it('rejects a duplicate student number', async () => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    await makeUser('31000001');
    const res = await create(adminToken, valid);
    expect(res.statusCode).toBe(409);
    expect(res.json().field).toBe('studentStaffNumber');
  });

  it('rejects a duplicate email regardless of case', async () => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    await create(adminToken, valid);
    const res = await create(adminToken, { ...valid, studentStaffNumber: '31000002', email: 'NALEDI@test.nwu.ac.za' });
    expect(res.statusCode).toBe(409);
    expect(res.json().field).toBe('email');
    expect(await query('SELECT 1 FROM users WHERE student_number = $1', ['31000002'])).toHaveLength(0);
  });

  it.each([
    ['studentStaffNumber', { studentStaffNumber: '123' }],
    ['name', { name: 'N' }],
    ['email', { email: 'not-an-email' }],
    ['role', { role: 'superuser' }],
    ['password', { password: 'short' }],
  ])('rejects an invalid %s', async (field, override) => {
    const adminToken = await tokenFor(await makeUser('90000001', 'admin'));
    const res = await create(adminToken, { ...valid, ...override });
    expect(res.statusCode).toBe(400);
    expect(res.json().field).toBe(field);
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
  const post = (token: string, payload: object) =>
    app.inject({
      method: 'POST',
      url: `${prefix}/dev/simulate-crossing`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

  it('matches a student number read from the card against the tag owner', async () => {
    const owner = await makeUser('30000010');
    const bike = await makeBike(owner);
    await makeTag(bike, 'T1');
    const gateId = await makeGate();
    const token = await tokenFor(await makeUser('90000002', 'guard'));

    const res = await post(token, { gateId, studentNumber: '30000010', tagUid: 'T1' });
    expect(res.statusCode).toBe(200);
    expect(res.json().gateShouldOpen).toBe(true);
    expect(res.json().crossing.event.studentNumber).toBe('30000010');
    expect(res.json().crossing.studentStaffNumber).toBe('30000010');
  });

  it('does not debounce by default, so repeated taps in the emulator each create an event', async () => {
    const owner = await makeUser('30000010');
    const bike = await makeBike(owner);
    await makeTag(bike, 'T1');
    const gateId = await makeGate();
    const token = await tokenFor(await makeUser('90000002', 'guard'));
    const [a, b] = [
      await post(token, { gateId, studentNumber: '30000010', tagUid: 'T1' }),
      await post(token, { gateId, studentNumber: '30000010', tagUid: 'T1' }),
    ];
    expect(a.json().crossing.event.eventId).not.toBe(b.json().crossing.event.eventId);
  });
});