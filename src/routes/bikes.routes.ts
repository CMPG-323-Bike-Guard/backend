import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireOwnerOrRoles } from '../auth-plugin';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { permissionsRepo } from '../repositories/permissions.repo';
import { tagsRepo } from '../repositories/tags.repo';
import { usersRepo } from '../repositories/users.repo';
import { savePhotoDataUrl } from '../uploads';
import { toBikeView } from '../services/views';

const createBikeSchema = z.object({
  ownerUserId: z.string().uuid(),
  name: z.string().min(1, 'Give the bike a name.'),
  makeModel: z.string().default(''),
  colour: z.string().default(''),
  photoDataUrl: z.string().nullable().optional(),
  submit: z.boolean().default(false),
});

const updateBikeSchema = z.object({
  name: z.string().min(1).optional(),
  makeModel: z.string().optional(),
  colour: z.string().optional(),
  photoDataUrl: z.string().nullable().optional(),
});

const reportLostSchema = z.object({ stolen: z.boolean().default(false) });
const grantPermissionSchema = z.object({
  studentNumber: z.string().trim().regex(/^\d{8}$/, 'A student or staff number is 8 digits.'),
  name: z.string().trim().max(80).optional(),
});

async function requireBikeAccess(request: Parameters<typeof requireOwnerOrRoles>[0], bikeId: string) {
  const bike = await bikesRepo.findById(bikeId);
  if (!bike) throw ApiError.notFound('That bike no longer exists.');
  requireOwnerOrRoles(request, bike.ownerUserId, 'admin');
  return bike;
}

export default async function bikesRoutes(app: FastifyInstance) {
  app.get<{ Params: { bikeId: string } }>('/bikes/:bikeId', async (request) => {
    const bike = await requireBikeAccess(request, request.params.bikeId);
    return toBikeView(bike);
  });

  app.post('/bikes', async (request) => {
    const actor = request.requireRole('student', 'admin');
    const body = createBikeSchema.parse(request.body);
    if (actor.role === 'student' && actor.userId !== body.ownerUserId) {
      throw ApiError.forbidden('You can only register bikes to your own profile.');
    }
    const owner = await usersRepo.findById(body.ownerUserId);
    if (!owner) throw ApiError.notFound('No student matches that number.');


    const bike = await bikesRepo.create({
      ownerUserId: body.ownerUserId,
      name: body.name.trim(),
      makeModel: body.makeModel.trim(),
      colour: body.colour.trim(),
      photoPath: null,
      status: body.submit ? 'pending_approval' : 'draft',
    });

    let finalBike = bike;
    if (body.photoDataUrl) {
      const photoPath = await savePhotoDataUrl(body.photoDataUrl, 'bikes', bike.bikeId);
      finalBike = (await bikesRepo.update(bike.bikeId, { photoPath }))!;
    }

    await auditRepo.record({
      actorUserId: actor.userId,
      action: body.submit ? 'registration.submitted' : 'registration.drafted',
      entityType: 'bike',
      entityId: bike.bikeId,
      detail: `${finalBike.name} (${finalBike.makeModel}).`,
    });
    if (body.submit && actor.userId !== body.ownerUserId) {
      await notificationsRepo.create({
        userId: body.ownerUserId,
        title: 'A bike was registered for you',
        body: `${finalBike.name} was added to your profile at the Protection Services desk.`,
        kind: 'registration',
      });
    }
    return toBikeView(finalBike);
  });

  app.patch<{ Params: { bikeId: string } }>('/bikes/:bikeId', async (request) => {
    const actor = request.requireAuth();
    const bike = await requireBikeAccess(request, request.params.bikeId);
    const body = updateBikeSchema.parse(request.body);

    let photoPath: string | undefined;
    if (body.photoDataUrl) photoPath = await savePhotoDataUrl(body.photoDataUrl, 'bikes', bike.bikeId);

    const updated = await bikesRepo.update(bike.bikeId, {
      name: body.name,
      makeModel: body.makeModel,
      colour: body.colour,
      photoPath,
    });
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'registration.updated',
      entityType: 'bike',
      entityId: bike.bikeId,
      detail: `Details updated for ${updated!.name}.`,
    });
    return toBikeView(updated!);
  });

  app.post<{ Params: { bikeId: string } }>('/bikes/:bikeId/submit', async (request) => {
    const actor = request.requireAuth();
    const bike = await requireBikeAccess(request, request.params.bikeId);
    const updated = await bikesRepo.setStatus(bike.bikeId, 'pending_approval', {
      reviewNote: null,
      submittedAt: new Date(),
    });
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'registration.submitted',
      entityType: 'bike',
      entityId: bike.bikeId,
      detail: `${updated!.name} submitted for review.`,
    });
    return toBikeView(updated!);
  });

  app.post<{ Params: { bikeId: string } }>('/bikes/:bikeId/report-lost', async (request) => {
    const actor = request.requireAuth();
    const bike = await requireBikeAccess(request, request.params.bikeId);
    const body = reportLostSchema.parse(request.body ?? {});
    const tag = await tagsRepo.findForBike(bike.bikeId);
    if (!tag) throw ApiError.notFound('No active tag is linked to that bike.');

    await tagsRepo.setStatus(tag.tagId, body.stolen ? 'stolen' : 'lost');
    await auditRepo.record({
      actorUserId: actor.userId,
      action: body.stolen ? 'tag.reported_stolen' : 'tag.reported_lost',
      entityType: 'rfid_tag',
      entityId: tag.tagId,
      detail: `${tag.tagRef} flagged by the owner.`,
    });
    await notificationsRepo.create({
      userId: bike.ownerUserId,
      title: body.stolen ? 'Bike reported stolen' : 'Lost tag recorded',
      body: `Tag ${tag.tagRef} is flagged. Guards are alerted if it is presented at a gate. Collect a replacement from Protection Services.`,
      kind: 'security',
    });
    return toBikeView((await bikesRepo.findById(bike.bikeId))!);
  });

  app.delete<{ Params: { bikeId: string } }>('/bikes/:bikeId', async (request, reply) => {
    const actor = request.requireAuth();
    const bike = await requireBikeAccess(request, request.params.bikeId);
    const tag = await tagsRepo.findForBike(bike.bikeId);
    if (tag && tag.status !== 'deactivated') {
      await tagsRepo.setStatus(tag.tagId, 'deactivated', new Date());
    }
    await bikesRepo.setStatus(bike.bikeId, 'removed');
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'registration.removed',
      entityType: 'bike',
      entityId: bike.bikeId,
      detail: `${bike.name} removed from the profile; tag deactivated.`,
    });
    return reply.status(204).send();
  });

  app.post<{ Params: { bikeId: string } }>('/bikes/:bikeId/permissions', async (request) => {
    const actor = request.requireAuth();
    const bike = await requireBikeAccess(request, request.params.bikeId);
    const body = grantPermissionSchema.parse(request.body);

        // The guest does not need a BikeGuard account: the gate identifies them by the number on their card.
    const target = await usersRepo.findByStudentNumber(body.studentNumber);
    if (target && target.role !== 'student') {
      throw ApiError.badRequest('That number belongs to a staff account, not a student card.', 'studentNumber');
    }
    if (target && target.accountStatus !== 'active') {
      throw ApiError.badRequest('That account is suspended.', 'studentNumber');
    }
    const owner = await usersRepo.findById(bike.ownerUserId);
    if (body.studentNumber === owner?.studentStaffNumber) {
      throw ApiError.badRequest('You already own this bike.', 'studentNumber');
    }
    const label = target?.name ?? (body.name || `Student ${body.studentNumber}`);
    const existing = await permissionsRepo.findActive(bike.bikeId, body.studentNumber);
    if (existing) throw ApiError.conflict(`${label} can already use this bike.`, 'studentNumber');

    await permissionsRepo.create({
      bikeId: bike.bikeId,
      studentNumber: body.studentNumber,
      authorisedUserId: target?.userId ?? null,
      name: body.name || null,
      grantedBy: actor.userId,
    });
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'permission.granted',
      entityType: 'bike_permission',
      entityId: bike.bikeId,
      detail: `${label} (${body.studentNumber}) authorised to use ${bike.name}.`,
    });
    if (target) {
      await notificationsRepo.create({
        userId: target.userId,
        title: `You can use ${bike.name}`,
        body: `${owner?.name ?? 'The owner'} authorised you to take this bike through the gate.`,
        kind: 'registration',
      });
    }
  });

  app.delete<{ Params: { permissionId: string } }>('/permissions/:permissionId', async (request) => {
    const actor = request.requireAuth();
    const permission = await permissionsRepo.findById(request.params.permissionId);
    if (!permission) throw ApiError.notFound('That permission no longer exists.');
    const bike = await requireBikeAccess(request, permission.bikeId);

    await permissionsRepo.revoke(permission.permissionId);
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'permission.revoked',
      entityType: 'bike_permission',
      entityId: bike.bikeId,
      detail: 'Authorisation withdrawn.',
    });
    return toBikeView(bike);
  });
}
