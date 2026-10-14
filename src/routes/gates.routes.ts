import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { emitRealtime } from '../realtime';


const createGateSchema = z.object({
  name: z.string().trim().min(2, 'Gate name needs at least 2 characters.').max(60, 'Gate name cannot be longer than 60 characters.'),
  location: z.string().trim().max(120, 'Location cannot be longer than 120 characters.').default(''),
});

const setModeSchema = z.object({ mode: z.enum(['automated', 'manual']) });

export default async function gatesRoutes(app: FastifyInstance) {
  app.get('/gates', async (request) => {
    request.requireAuth();
    return gatesRepo.list();
  });

    app.post('/gates', async (request) => {
    const actor = request.requireRole('admin');
    const body = createGateSchema.parse(request.body);

    let gate;
    try {
      gate = await gatesRepo.create({ name: body.name, location: body.location });
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw ApiError.conflict('A gate with that name already exists.', 'name');
      }
      throw err;
    }

    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'gate.created',
      entityType: 'gate',
      entityId: gate.gateId,
      detail: `Gate "${gate.name}" was added${gate.location ? ` at ${gate.location}` : ''}.`,
    });
    emitRealtime({ type: 'gate', gate });
    return gate;
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
