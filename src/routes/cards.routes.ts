import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import { ApiError } from '../errors';
import { emitRealtime } from '../realtime';
import { auditRepo } from '../repositories/audit.repo';
import { cardsRepo } from '../repositories/cards.repo';
import { usersRepo } from '../repositories/users.repo';
import { displayRef, hmacIdentifier } from '../security';
import { latestTap, rememberTap } from '../services/card-taps';

const tapSchema = z.object({
  uid: z.string().regex(/^[0-9A-Fa-f]{8,20}$/, 'Invalid card UID.'),
  gateId: z.string().uuid().optional(),
});

export default async function cardsRoutes(app: FastifyInstance) {
  app.post('/cards/tap', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request) => {
    const key = request.headers['x-bridge-key'];
    if (!config.cardBridgeKey || key !== config.cardBridgeKey) throw ApiError.unauthenticated();
    const body = tapSchema.parse(request.body);

    const cardHmac = hmacIdentifier(body.uid.toUpperCase());
    const cardRef = displayRef('CRD', cardHmac);
    rememberTap(cardHmac, cardRef);

    const studentNumber = await cardsRepo.findStudentNumber(cardHmac);
    emitRealtime({ type: 'card-tap', gateId: body.gateId, studentNumber, cardRef });
    return { ok: true, linked: studentNumber !== null, cardRef };
  });

  app.post<{ Params: { userId: string } }>('/users/:userId/card', async (request) => {
    const actor = request.requireRole('admin');
    const person = await usersRepo.findById(request.params.userId);
    if (!person) throw ApiError.notFound('That person no longer exists.');

    const tap = latestTap();
    if (!tap) throw ApiError.badRequest('No card was tapped in the last minute. Tap the card and try again.');

    await cardsRepo.link(person.studentStaffNumber, tap.cardHmac, tap.cardRef);
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'card.linked',
      entityType: 'user',
      entityId: person.userId,
      detail: `Card ${tap.cardRef} linked to ${person.name} (${person.studentStaffNumber}).`,
    });
    return { cardRef: tap.cardRef };
  });
}