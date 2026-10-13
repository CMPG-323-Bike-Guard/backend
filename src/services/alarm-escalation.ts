import { auditRepo } from '../repositories/audit.repo';
import { alarmsRepo } from '../repositories/alarms.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { usersRepo } from '../repositories/users.repo';
import { config } from '../config';
import { emitRealtime } from '../realtime';
import { buildAlarmView } from './views';
import type { Alarm, EscalationReason } from '../types';

export async function announceEscalation(alarm: Alarm, reason: EscalationReason, actorUserId: string | null): Promise<void> {
  const view = await buildAlarmView(alarm);
  const who = view.presentedUser?.name ?? 'an unidentified card';
  const actor = actorUserId ? await usersRepo.findById(actorUserId) : null;
  const why =
    reason === 'no_acknowledgement'
      ? `No guard acknowledged it within ${Math.round(config.alarmAckTimeoutMs / 60_000)} min.`
      : `${actor?.name ?? 'A guard'} asked for help.`;

  await auditRepo.record({
    actorUserId,
    action: 'alarm.escalated',
    entityType: 'alarm',
    entityId: alarm.alarmId,
    detail: `Escalated to supervisor. ${why}`,
  });

  const admins = (await usersRepo.list('admin')).filter((user) => user.accountStatus === 'active');
  await Promise.all(
    admins.map((admin) =>
      notificationsRepo.create({
        userId: admin.userId,
        kind: 'security',
        title: `Alarm escalated at ${view.gateName}`,
        body: `Gate held for ${who}. ${why} Please follow up with the guard on duty.`,
      }),
    ),
  );

  emitRealtime({ type: 'alarm-escalated', alarm: view });
}

export async function escalateOverdueAlarms(): Promise<number> {
  const escalated = await alarmsRepo.escalateOverdue();
  for (const alarm of escalated) await announceEscalation(alarm, 'no_acknowledgement', null);
  return escalated.length;
}

export function startAlarmEscalationJob(onError: (err: unknown) => void): NodeJS.Timeout {
  const timer = setInterval(() => {
    escalateOverdueAlarms().catch(onError);
  }, config.alarmEscalationIntervalMs);
  timer.unref();
  return timer;
}