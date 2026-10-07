import { beforeEach, describe, expect, it } from 'vitest';
import { query } from '../src/db';
import { permissionsRepo } from '../src/repositories/permissions.repo';
import { processCrossing } from '../src/services/verification';
import { countRows, makeBike, makeGate, makeTag, makeUser, resetDb } from './helpers';

let gateId: string;
let ownerId: string;
let otherId: string;
let bikeId: string;

beforeEach(async () => {
  await resetDb();
  gateId = await makeGate();
  ownerId = await makeUser('30000001');
  otherId = await makeUser('30000002');
  bikeId = await makeBike(ownerId);
  await makeTag(bikeId, 'TAG-ACTIVE');
});

const scan = (studentNumber: string | null, tagUid: string | null, extra: object = {}) =>
  processCrossing({ gateId, studentNumber, tagUid, debounce: false, ...extra });

describe('processCrossing decisions', () => {
  it('opens the gate for the owner with their own tag', async () => {
    const outcome = await scan('30000001', 'TAG-ACTIVE');
    expect(outcome.gateShouldOpen).toBe(true);
    expect(outcome.alarmRaised).toBe(false);
    expect(outcome.crossing.event.result).toBe('match');
    expect(outcome.crossing.event.bikeId).toBe(bikeId);
    expect(outcome.crossing.event.studentNumber).toBe('30000001');   // <- add this line
    expect(await countRows('alarms')).toBe(0);
  });

  it('opens the gate for a user with an active permission on the bike', async () => {
    await permissionsRepo.create({ bikeId, authorisedUserId: otherId, grantedBy: ownerId });
    const outcome = await scan('30000002', 'TAG-ACTIVE');
    expect(outcome.gateShouldOpen).toBe(true);
  });

  it('flags a tag registered to someone else', async () => {
    const outcome = await scan('30000002', 'TAG-ACTIVE');
    expect(outcome.gateShouldOpen).toBe(false);
    expect(outcome.alarmRaised).toBe(true);
    expect(outcome.crossing.event.mismatchReason).toBe('tag_registered_to_other_user');
  });

  it('flags an unknown card presenting a real tag', async () => {
    const outcome = await scan('39999999', 'TAG-ACTIVE');
    expect(outcome.crossing.event.mismatchReason).toBe('tag_registered_to_other_user');
    expect(outcome.crossing.event.userId).toBeNull();
  });


  it('flags a tag that was never registered', async () => {
    const outcome = await scan('30000001', 'TAG-NOPE');
    expect(outcome.crossing.event.mismatchReason).toBe('tag_not_registered');
    expect(outcome.crossing.event.bikeId).toBeNull();
  });

  it.each([
    ['lost', 'tag_reported_lost'],
    ['stolen', 'tag_reported_stolen'],
    ['deactivated', 'tag_deactivated'],
    ['awaiting_collection', 'tag_deactivated'],
  ] as const)('maps a %s tag to %s', async (status, reason) => {
    await query('UPDATE rfid_tags SET status = $1', [status]);
    const outcome = await scan('30000001', 'TAG-ACTIVE');
    expect(outcome.gateShouldOpen).toBe(false);
    expect(outcome.crossing.event.mismatchReason).toBe(reason);
    expect(outcome.crossing.event.bikeId).toBe(bikeId);
  });

  it.each([
    ['card only', '30000001', null],
    ['tag only', null, 'TAG-ACTIVE'],
    ['nothing', null, null],
    ['blank strings', '  ', ' '],
    ['letters instead of digits', 'abcdefgh', 'TAG-ACTIVE'],
    ['seven digits', '3000000', 'TAG-ACTIVE'],
    ['nine digits', '300000012', 'TAG-ACTIVE'],
    ['digits with a space inside', '3000 0001', 'TAG-ACTIVE'],
  ])('treats %s as an incomplete read', async (_name, card, tag) => {
    const outcome = await scan(card, tag);
    expect(outcome.crossing.event.mismatchReason).toBe('incomplete_read');
    expect(outcome.alarmRaised).toBe(true);
  });

    it('flags a suspended account even when the tag is theirs', async () => {
    await query("UPDATE users SET account_status = 'suspended' WHERE user_id = $1", [ownerId]);
    const outcome = await scan('30000001', 'TAG-ACTIVE');
    expect(outcome.gateShouldOpen).toBe(false);
    expect(outcome.crossing.event.mismatchReason).toBe('tag_registered_to_other_user');
  });

    it('stores the student number as read, in plain text, and only a display reference for the tag', async () => {
    await scan('30000001', 'TAG-ACTIVE');
    const rows = await query<{ student_number: string; tag_ref: string }>(
      'SELECT student_number, tag_ref FROM gate_events',
    );
    expect(rows[0].student_number).toBe('30000001');
    expect(rows[0].tag_ref).toMatch(/^BG-[0-9A-F]{6}$/);
    expect(rows[0].tag_ref).not.toContain('TAG-ACTIVE');
  });

  it('rejects scans for a gate in manual mode', async () => {
    const manualGate = await makeGate('manual');
    await expect(
      processCrossing({ gateId: manualGate, studentNumber: '30000001', tagUid: 'TAG-ACTIVE', debounce: false }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'gate_manual' });
    expect(await countRows('gate_events')).toBe(0);
  });

  it('rejects scans for an unknown gate', async () => {
    await expect(
      processCrossing({
        gateId: '00000000-0000-4000-8000-000000000000',
        studentNumber: '30000001',
        tagUid: 'TAG-ACTIVE',
        debounce: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('writes event, alarm and audit entry together for a mismatch', async () => {
    await scan('30000002', 'TAG-ACTIVE');
    expect(await countRows('gate_events')).toBe(1);
    expect(await countRows('alarms')).toBe(1);
    expect(await countRows('audit_log')).toBe(1);
  });

  it('rolls everything back when the audit write fails', async () => {
    await query(`ALTER TABLE audit_log ADD CONSTRAINT force_fail CHECK (action <> 'crossing.mismatch')`);
    try {
      await expect(scan('30000002', 'TAG-ACTIVE')).rejects.toThrow();
      expect(await countRows('gate_events')).toBe(0);
      expect(await countRows('alarms')).toBe(0);
    } finally {
      await query('ALTER TABLE audit_log DROP CONSTRAINT force_fail');
    }
  });
});

describe('scan debounce', () => {
  it('returns the first outcome for a repeated identical scan without a second event or alarm', async () => {
    const first = await processCrossing({ gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' });
    const second = await processCrossing({ gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' });
    expect(first.duplicate).toBeUndefined();
    expect(second.duplicate).toBe(true);
    expect(second.crossing.event.eventId).toBe(first.crossing.event.eventId);
    expect(await countRows('gate_events')).toBe(1);
    expect(await countRows('alarms')).toBe(1);
  });

  it('collapses concurrent identical scans into one event', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => processCrossing({ gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' })),
    );
    expect(new Set(results.map((r) => r.crossing.event.eventId)).size).toBe(1);
    expect(await countRows('gate_events')).toBe(1);
  });

  it('treats a different card or tag as a separate scan', async () => {
    await processCrossing({ gateId, studentNumber: '30000002', tagUid: 'TAG-ACTIVE' });
    await processCrossing({ gateId, studentNumber: '30000001', tagUid: 'TAG-ACTIVE' });
    expect(await countRows('gate_events')).toBe(2);
  });

  it('does not cache a failed scan', async () => {
    const manualGate = await makeGate('manual');
    const input = { gateId: manualGate, studentNumber: '30000001', tagUid: 'TAG-ACTIVE' };
    await expect(processCrossing(input)).rejects.toMatchObject({ code: 'gate_manual' });
    await query("UPDATE gates SET mode = 'automated' WHERE gate_id = $1", [manualGate]);
    const outcome = await processCrossing(input);
    expect(outcome.gateShouldOpen).toBe(true);
  });
});