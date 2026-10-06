import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { cardsRepo } from '../repositories/cards.repo';
import { usersRepo } from '../repositories/users.repo';
import { displayRef, hmacIdentifier } from '../security';

const enrolSchema = z.object({
  studentNumber: z.string().min(1, "Enter the student's or staff member's number."),
  cardUid: z.string().trim().min(1, 'Scan or enter the card UID.'),
  replaceExisting: z.boolean().default(false),
});

export default async function cardsRoutes(app: FastifyInstance) {
  app.post('/cards', async (request, reply) => {
    const actor = request.requireRole('admin');
    const body = enrolSchema.parse(request.body);

    const user = await usersRepo.findByStudentNumber(body.studentNumber.trim());
    if (!user) throw ApiError.badRequest('No student or staff member matches that number.', 'studentNumber');

    const cardHmac = hmacIdentifier(body.cardUid);
    const clash = await cardsRepo.findByHmac(cardHmac);
    if (clash) throw ApiError.conflict('That card is already enrolled.', 'cardUid');

    const current = await cardsRepo.findByUserId(user.userId);
    if (current && !body.replaceExisting) {
      throw ApiError.conflict('This person already has an active card. Confirm to replace it.', 'studentNumber');
    }
    if (current) await cardsRepo.block(current.cardId);

    const card = await cardsRepo.create({ userId: user.userId, cardHmac, cardRef: displayRef('CRD', cardHmac) });

    await auditRepo.record({
      actorUserId: actor.userId,
      action: current ? 'card.replaced' : 'card.enrolled',
      entityType: 'card',
      entityId: card.cardId,
      detail: current
        ? `Card ${card.cardRef} enrolled for ${user.name}, replacing ${current.cardRef}.`
        : `Card ${card.cardRef} enrolled for ${user.name}.`,
    });

    reply.status(201);
    return card;
  });
}