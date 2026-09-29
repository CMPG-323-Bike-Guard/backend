import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { emitRealtime } from '../realtime';

const setModeSchema = z.object({ mode: z.enum(['automated', 'manual']) });

export default async function gatesRoutes(app: FastifyInstance) {
  app.get('/gates', async (request) => {
    request.requireAuth();
    return gatesRepo.list();
  });

  app.patch<{ Params: { gateId: string } }>('/gates/:gateId/mode', async (request) => {
    const actor = request.requireRole('guard', 'admin');
    const body = setModeSchema.parse(request.body);
    const gate = await gatesRepo.findById(request.params.gateId);
    if (!gate) throw ApiError.notFound('That gate is not configured.');

    const health = body.mode === 'automated' ? 'good' : gate.health === 'error' ? 'error' : 'warning';
    const updated = await gatesRepo.setMode(gate.gateId, body.mode, health, body.mode === 'manual' ? new Date() : null);

    await auditRepo.record({
      actorUserId: actor.userId,
      action: body.mode === 'manual' ? 'gate.manual_mode_on' : 'gate.manual_mode_off',
      entityType: 'gate',
      entityId: gate.gateId,
      detail: `Gate switched to ${body.mode} mode.`,
    });
    emitRealtime({ type: 'gate', gate: updated! });
    return updated;
  });
}
