import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import { processCrossing } from '../services/verification';

const simulateSchema = z.object({
  gateId: z.string().uuid(),
  cardUid: z.string().nullable().optional(),
  tagUid: z.string().nullable().optional(),
});

export default async function devRoutes(app: FastifyInstance) {
  if (config.isProduction) return;

  app.post('/dev/simulate-crossing', async (request) => {
    request.requireRole('guard', 'admin');
    const body = simulateSchema.parse(request.body);
    return processCrossing({ gateId: body.gateId, cardUid: body.cardUid, tagUid: body.tagUid, source: 'automated' });
  });
}
