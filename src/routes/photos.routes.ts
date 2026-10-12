import type { FastifyInstance } from 'fastify';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { photosRepo } from '../repositories/photos.repo';
import type { PhotoReviewResult, PhotoTargetType } from '../types';

function parseTarget(value: string): PhotoTargetType {
  if (value !== 'user' && value !== 'bike') throw ApiError.notFound('That photo owner or bike no longer exists.');
  return value;
}

async function requireReviewable(targetType: PhotoTargetType, entityId: string) {
  const target = await photosRepo.ownerAndLabel(targetType, entityId);
  if (!target) throw ApiError.notFound('That photo owner or bike no longer exists.');
  return target;
}

export default async function photosRoutes(app: FastifyInstance) {
  app.get('/photos/pending', async (request) => {
    request.requireRole('admin');
    return photosRepo.listPending();
  });

  app.post<{ Params: { targetType: string; entityId: string } }>(
    '/photos/:targetType/:entityId/approve',
    async (request): Promise<PhotoReviewResult> => {
      const admin = request.requireRole('admin');
      const targetType = parseTarget(request.params.targetType);
      const { entityId } = request.params;
      const target = await requireReviewable(targetType, entityId);

      const photo = await photosRepo.approve(targetType, entityId, admin.userId);
      if (!photo) throw new ApiError(409, 'not_pending', 'That photo is not awaiting review.');

      await auditRepo.record({
        actorUserId: admin.userId,
        action: 'photo.approved',
        entityType: targetType,
        entityId,
        detail: `${targetType} photo approved.`,
      });
      await notificationsRepo.create({
        userId: target.ownerUserId,
        title: `${target.label} was approved`,
        body: `${target.label} is approved and now live.`,
        kind: 'photo_review',
      });
      return { targetType, entityId, photo };
    },
  );

  app.post<{ Params: { targetType: string; entityId: string } }>(
    '/photos/:targetType/:entityId/reject',
    async (request): Promise<PhotoReviewResult> => {
      const admin = request.requireRole('admin');
      const targetType = parseTarget(request.params.targetType);
      const { entityId } = request.params;
      const target = await requireReviewable(targetType, entityId);

      const rawReason = (request.body as { reason?: unknown } | null | undefined)?.reason;
      const reason = typeof rawReason === 'string' ? rawReason.trim() : '';

      const photo = reason ? await photosRepo.reject(targetType, entityId, admin.userId, reason) : null;
      if (!photo) {
        const pending = (await photosRepo.listPending()).some(
          (item) => item.targetType === targetType && item.entityId === entityId,
        );
        if (!pending) throw new ApiError(409, 'not_pending', 'That photo is not awaiting review.');
        throw new ApiError(400, 'reason_required', 'A rejection reason is required.', 'reason');
      }

      await auditRepo.record({
        actorUserId: admin.userId,
        action: 'photo.rejected',
        entityType: targetType,
        entityId,
        detail: `Photo rejected: ${reason}`,
      });
      await notificationsRepo.create({
        userId: target.ownerUserId,
        title: `${target.label} was not approved`,
        body: `${target.label} was not approved. Reason: ${reason}`,
        kind: 'photo_review',
      });
      return { targetType, entityId, photo };
    },
  );
}