import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { tagsRepo } from '../repositories/tags.repo';
import { displayRef, hmacIdentifier } from '../security';
import { toBikeView } from '../services/views';

const deactivateSchema = z.object({ reason: z.string().default('') });
const replaceSchema = z.object({ tagRef: z.string().min(1, 'Enter the new tag ID.') });

export default async function tagsRoutes(app: FastifyInstance) {
  app.post<{ Params: { tagId: string } }>('/tags/:tagId/collect', async (request) => {
    const actor = request.requireRole('admin');
    const tag = await tagsRepo.findById(request.params.tagId);
    if (!tag) throw ApiError.notFound('That tag no longer exists.');

    await tagsRepo.setStatus(tag.tagId, 'active');
    const bike = await bikesRepo.setStatus(tag.bikeId, 'active');
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'tag.collected',
      entityType: 'rfid_tag',
      entityId: tag.tagId,
      detail: `${tag.tagRef} collected and fitted to ${bike!.name}.`,
    });
    await notificationsRepo.create({
      userId: bike!.ownerUserId,
      title: `${bike!.name} is protected`,
      body: 'Tap your card at the pilot gate and the boom lifts automatically.',
      kind: 'registration',
    });
    return toBikeView(bike!);
  });

  app.post<{ Params: { tagId: string } }>('/tags/:tagId/deactivate', async (request) => {
    const actor = request.requireRole('admin');
    const tag = await tagsRepo.findById(request.params.tagId);
    if (!tag) throw ApiError.notFound('That tag no longer exists.');
    const body = deactivateSchema.parse(request.body ?? {});

    await tagsRepo.setStatus(tag.tagId, 'deactivated', new Date());
    const bike = await bikesRepo.setStatus(tag.bikeId, 'tag_pending');
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'tag.deactivated',
      entityType: 'rfid_tag',
      entityId: tag.tagId,
      detail: `${tag.tagRef} deactivated: ${body.reason.trim() || 'no reason given'}.`,
    });
    return toBikeView(bike!);
  });

  app.post<{ Params: { bikeId: string } }>('/bikes/:bikeId/tag', async (request) => {
    const actor = request.requireRole('admin');
    const bike = await bikesRepo.findById(request.params.bikeId);
    if (!bike) throw ApiError.notFound('That bike no longer exists.');
    const body = replaceSchema.parse(request.body);

    const tagHmac = hmacIdentifier(body.tagRef);
    const clash = await tagsRepo.findLiveByHmac(tagHmac);
    if (clash) throw ApiError.conflict('That tag is already issued.', 'tagRef');

    const previous = await tagsRepo.findForBike(bike.bikeId);
    if (previous) await tagsRepo.setStatus(previous.tagId, 'deactivated', new Date());

    const tagRef = displayRef('BG', tagHmac);
    await tagsRepo.create({
      bikeId: bike.bikeId,
      tagHmac,
      tagRef,
      status: 'awaiting_collection',
      replacesTagId: previous?.tagId ?? null,
    });
    const updated = await bikesRepo.setStatus(bike.bikeId, 'tag_pending');

    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'tag.replaced',
      entityType: 'bike',
      entityId: bike.bikeId,
      detail: `${previous?.tagRef ?? 'previous tag'} replaced by ${tagRef}. Registration history retained.`,
    });
    await notificationsRepo.create({
      userId: bike.ownerUserId,
      title: 'Replacement tag ready to collect',
      body: `Tag ${tagRef} is ready at the Protection Services desk. Your registration history is unchanged.`,
      kind: 'tag_ready',
    });
    return toBikeView(updated!);
  });
}
