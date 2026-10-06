import { auditRepo } from '../repositories/audit.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { config } from '../config';
import { emitRealtime } from '../realtime';

const lastSeen = new Map<string, number>();

export function recordHeartbeat(gateId: string, now = Date.now()): void {
  lastSeen.set(gateId, now);
}

export function resetWatchdogState(): void {
  lastSeen.clear();
}

export async function checkGateHealth(now = Date.now()): Promise<string[]> {
  const flipped: string[] = [];
  const gates = await gatesRepo.list();

  for (const gate of gates) {
    const seenAt = lastSeen.get(gate.gateId);
    if (seenAt === undefined) continue;
    if (gate.mode !== 'automated') continue;
    if (now - seenAt <= config.gateOfflineAfterMs) continue;

    const updated = await gatesRepo.setMode(gate.gateId, 'manual', 'error', new Date(now));
    if (!updated) continue;
    await auditRepo.record({
      actorUserId: null,
      action: 'gate.reader_offline',
      entityType: 'gate',
      entityId: gate.gateId,
      detail: `${gate.name} stopped reporting for ${Math.round((now - seenAt) / 1000)}s and was switched to manual checks.`,
    });
    emitRealtime({ type: 'gate', gate: updated });
    flipped.push(gate.gateId);
  }

  return flipped;
}

export function startGateWatchdog(onError: (err: unknown) => void): NodeJS.Timeout {
  const timer = setInterval(() => {
    checkGateHealth().catch(onError);
  }, config.gateWatchdogIntervalMs);
  timer.unref();
  return timer;
}