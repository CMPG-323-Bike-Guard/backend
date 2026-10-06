import { beforeEach, describe, expect, it } from 'vitest';
import { gatesRepo } from '../src/repositories/gates.repo';
import { checkGateHealth, recordHeartbeat } from '../src/services/gate-watchdog';
import { countRows, makeGate, resetDb } from './helpers';

let gateId: string;
const t0 = 1_800_000_000_000;

beforeEach(async () => {
  await resetDb();
  gateId = await makeGate();
});

describe('gate watchdog', () => {
  it('leaves a gate alone while it keeps reporting', async () => {
    recordHeartbeat(gateId, t0);
    expect(await checkGateHealth(t0 + 20_000)).toEqual([]);
    expect((await gatesRepo.findById(gateId))!.mode).toBe('automated');
  });

  it('switches a silent gate to manual and records an audit entry', async () => {
    recordHeartbeat(gateId, t0);
    expect(await checkGateHealth(t0 + 45_000)).toEqual([gateId]);
    const gate = await gatesRepo.findById(gateId);
    expect(gate!.mode).toBe('manual');
    expect(gate!.health).toBe('error');
    expect(await countRows('audit_log')).toBe(1);
  });

  it('does not flip it again on the next check', async () => {
    recordHeartbeat(gateId, t0);
    await checkGateHealth(t0 + 45_000);
    expect(await checkGateHealth(t0 + 60_000)).toEqual([]);
    expect(await countRows('audit_log')).toBe(1);
  });

  it('ignores gates that have never reported (no reader installed yet)', async () => {
    expect(await checkGateHealth(t0 + 600_000)).toEqual([]);
    expect((await gatesRepo.findById(gateId))!.mode).toBe('automated');
  });
});