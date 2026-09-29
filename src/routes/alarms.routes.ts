import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { alarmsRepo } from '../repositories/alarms.repo';
import { auditRepo } from '../repositories/audit.repo';
import { emitRealtime } from '../realtime';
import { buildAlarmView } from '../services/views';

const resolveSchema = z.object({
  outcome: z.enum(['cleared_in_person', 'reported_stolen', 'escalated']),
  notes: z.string().default(''),
});

export default async function alarmsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { status?: 'live' | 'all' } }>('/alarms', async (request) => {
    request.requireRole('guard', 'admin');
    const alarms = await alarmsRepo.list(request.query.status ?? 'live');
    return Promise.all(alarms.map(buildAlarmView));
  });

  app.post<{ Params: { alarmId: string } }>('/alarms/:alarmId/resolution', async (request) => {
    const actor = request.requireRole('guard', 'admin');
    const body = resolveSchema.parse(request.body);
    const alarm = await alarmsRepo.findById(request.params.alarmId);
    if (!alarm) throw ApiError.notFound('That alarm has already been closed.');
    if (alarm.status !== 'open' && alarm.status !== 'escalated') {
      throw ApiError.conflict('That alarm has already been resolved.');
    }

    const updated = await alarmsRepo.resolve(alarm.alarmId, body.outcome, body.notes.trim() || null, actor.userId);
    await auditRepo.record({
      actorUserId: actor.userId,
      action: `alarm.${body.outcome}`,
      entityType: 'alarm',
      entityId: alarm.alarmId,
      detail: body.notes.trim() || 'No additional notes.',
    });

    const view = await buildAlarmView(updated!);
    emitRealtime({ type: 'alarm-updated', alarm: view });
    return view;
  });
}
