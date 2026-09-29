import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { tagsRepo } from '../repositories/tags.repo';
import { displayRef, hmacIdentifier } from '../security';
import { toBikeView, toBikeViews } from '../services/views';
import type { BikeStatus } from '../types';

const approveSchema = z.object({ tagRef: z.string().min(1, 'Enter the tag ID to allocate.') });
const rejectSchema = z.object({ reason: z.string().min(1, 'Give a reason for the student.') });

export default async function registrationsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { status?: BikeStatus } }>('/registrations', async (request) => {
    request.requireRole('admin');
    const bikes = await bikesRepo.listByStatus(request.query.status);
    return toBikeViews(bikes);
  });

  app.post<{ Params: { bikeId: string } }>('/registrations/:bikeId/approve', async (request) => {
    const actor = request.requireRole('admin');
    const bike = await bikesRepo.findById(request.params.bikeId);
    if (!bike) throw ApiError.notFound('That registration no longer exists.');
    const body = approveSchema.parse(request.body);

    const tagHmac = hmacIdentifier(body.tagRef);
    const clash = await tagsRepo.findLiveByHmac(tagHmac);
    if (clash) throw ApiError.conflict(`That tag is already issued to another bike.`, 'tagRef');

    const tagRef = displayRef('BG', tagHmac);
    await tagsRepo.create({ bikeId: bike.bikeId, tagHmac, tagRef, status: 'awaiting_collection' });
    const updated = await bikesRepo.setStatus(bike.bikeId, 'tag_pending', { reviewedAt: new Date(), reviewNote: null });

    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'registration.approved',
      entityType: 'bike',
      entityId: bike.bikeId,
      detail: `Approved and tag ${tagRef} allocated.`,
    });
    await notificationsRepo.create({
      userId: bike.ownerUserId,
      title: 'Your tag is ready to collect',
      body: `Tag ${tagRef} for "${bike.name}" is ready at the Protection Services desk. Bring your student card.`,
      kind: 'tag_ready',
    });
    return toBikeView(updated!);
  });

  app.post<{ Params: { bikeId: string } }>('/registrations/:bikeId/reject', async (request) => {
    const actor = request.requireRole('admin');
    const bike = await bikesRepo.findById(request.params.bikeId);
    if (!bike) throw ApiError.notFound('That registration no longer exists.');
    const body = rejectSchema.parse(request.body);

    const updated = await bikesRepo.setStatus(bike.bikeId, 'rejected', {
      reviewedAt: new Date(),
      reviewNote: body.reason.trim(),
    });
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'registration.rejected',
      entityType: 'bike',
      entityId: bike.bikeId,
      detail: body.reason.trim(),
    });
    await notificationsRepo.create({
      userId: bike.ownerUserId,
      title: `${bike.name} needs another look`,
      body: body.reason.trim(),
      kind: 'registration',
    });
    return toBikeView(updated!);
  });
}
