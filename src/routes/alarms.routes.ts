import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { alarmsRepo } from '../repositories/alarms.repo';
import { auditRepo } from '../repositories/audit.repo';
import { usersRepo } from '../repositories/users.repo';
import { emitRealtime } from '../realtime';
import { announceEscalation, escalateOverdueAlarms } from '../services/alarm-escalation';
import { buildAlarmView } from '../services/views';
import { isLiveAlarm } from '../types';

const resolveSchema = z.object({
  outcome: z.enum(['cleared_in_person', 'reported_stolen']),
  notes: z.string().default(''),
});

const escalateSchema = z.object({
  notes: z.string().default(''),
});

export default async function alarmsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { status?: 'live' | 'all' } }>('/alarms', async (request) => {
    request.requireRole('guard', 'admin');
    await escalateOverdueAlarms();
    const alarms = await alarmsRepo.list(request.query.status ?? 'live');
    return Promise.all(alarms.map(buildAlarmView));
  });

  app.post<{ Params: { alarmId: string } }>('/alarms/:alarmId/acknowledge', async (request) => {
    const actor = request.requireRole('guard', 'admin');
    const alarm = await alarmsRepo.findById(request.params.alarmId);
    if (!alarm) throw ApiError.notFound('That alarm no longer exists.');
    if (!isLiveAlarm(alarm.status)) throw ApiError.conflict('That alarm has already been resolved.');
    if (alarm.acknowledgedAt) throw ApiError.conflict('Another guard has already acknowledged this alarm.');

    const updated = await alarmsRepo.acknowledge(alarm.alarmId, actor.userId);
    if (!updated) throw ApiError.conflict('Another guard has already acknowledged this alarm.');

    const guard = await usersRepo.findById(actor.userId);
    const seconds = Math.round((Date.now() - new Date(updated.raisedAt).getTime()) / 1000);
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'alarm.acknowledged',
      entityType: 'alarm',
      entityId: alarm.alarmId,
      detail: `${guard?.name ?? 'Guard'} acknowledged the alarm after ${seconds}s.`,
    });

    const view = await buildAlarmView(updated);
    emitRealtime({ type: 'alarm-updated', alarm: view });
    return view;
  });

  app.post<{ Params: { alarmId: string } }>('/alarms/:alarmId/escalate', async (request) => {
    const actor = request.requireRole('guard', 'admin');
    const body = escalateSchema.parse(request.body ?? {});
    const alarm = await alarmsRepo.findById(request.params.alarmId);
    if (!alarm) throw ApiError.notFound('That alarm no longer exists.');
    if (!isLiveAlarm(alarm.status)) throw ApiError.conflict('That alarm has already been resolved.');
    if (alarm.status === 'escalated') throw ApiError.conflict('This alarm is already escalated.');

    const updated = await alarmsRepo.escalate(alarm.alarmId, 'guard_request', actor.userId, body.notes.trim() || null);
    if (!updated) throw ApiError.conflict('This alarm is already escalated.');

    await announceEscalation(updated, 'guard_request', actor.userId);
    return buildAlarmView(updated);
  });

  app.post<{ Params: { alarmId: string } }>('/alarms/:alarmId/resolution', async (request) => {
    const actor = request.requireRole('guard', 'admin');
    const body = resolveSchema.parse(request.body);
    const alarm = await alarmsRepo.findById(request.params.alarmId);
    if (!alarm) throw ApiError.notFound('That alarm no longer exists.');
    if (!isLiveAlarm(alarm.status)) throw ApiError.conflict('That alarm has already been resolved.');

    const updated = await alarmsRepo.resolve(alarm.alarmId, body.outcome, body.notes.trim() || null, actor.userId);
    if (!updated) throw ApiError.conflict('That alarm has already been resolved.');

    await auditRepo.record({
      actorUserId: actor.userId,
      action: `alarm.resolved.${body.outcome}`,
      entityType: 'alarm',
      entityId: alarm.alarmId,
      detail: body.notes.trim() || 'No additional notes.',
    });

    const view = await buildAlarmView(updated);
    emitRealtime({ type: 'alarm-updated', alarm: view });
    return view;
  });
}