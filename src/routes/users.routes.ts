import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireOwnerOrRoles } from '../auth-plugin';
import { ApiError } from '../errors';
import { bikesRepo } from '../repositories/bikes.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { usersRepo } from '../repositories/users.repo';
import { toBikeViews } from '../services/views';
import { query, withTransaction } from '../db';
import { auditRepo } from '../repositories/audit.repo';
import { hashPassword, verifyPassword } from '../security';
import { config } from '../config';
import { withoutPending } from '../photos';
import { photosRepo } from '../repositories/photos.repo';
import type { Role } from '../types';
import { savePhotoDataUrl } from '../uploads';

const createUserSchema = z.object({
  studentStaffNumber: z.string().trim().regex(/^\d{8}$/, 'A student or staff number is 8 digits.'),
  name: z.string().trim().min(2, 'Enter the full name.').max(80, 'Names are at most 80 characters.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  role: z.enum(['student', 'guard', 'admin']),
  password: z.string().min(8, 'Passwords are at least 8 characters.'),
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,30}$/;

function parseOwnDetails(body: unknown) {
  const input = (body ?? {}) as { name?: unknown; email?: unknown; phone?: unknown };
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';

  if (name.length < 2 || name.length > 80) {
    throw new ApiError(400, 'invalid_name', 'Name must be between 2 and 80 characters.', 'name');
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'invalid_email', 'Enter a valid email address.', 'email');
  }
  if (phone.length > 30 || (phone && !PHONE_PATTERN.test(phone))) {
    throw new ApiError(400, 'invalid_phone', 'Enter a valid phone number.', 'phone');
  }
  return { name, email, phone: phone || null };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES: Role[] = ['student', 'guard', 'admin'];

function parseAdminEdit(body: unknown) {
  const details = parseOwnDetails(body);
  const input = (body ?? {}) as { studentStaffNumber?: unknown; role?: unknown };
  const studentNumber = typeof input.studentStaffNumber === 'string' ? input.studentStaffNumber.trim() : '';
  if (!/^\d{8}$/.test(studentNumber)) {
    throw new ApiError(400, 'invalid_student_number', 'A student or staff number is 8 digits.', 'studentStaffNumber');
  }
  if (typeof input.role !== 'string' || !ROLES.includes(input.role as Role)) {
    throw new ApiError(400, 'invalid_role', 'Choose a role.', 'role');
  }
  return { ...details, studentNumber, role: input.role as Role };
}

async function requireManageableUser(request: FastifyRequest<{ Params: { userId: string } }>, actorUserId: string) {
  const { userId } = request.params;
  if (!UUID_PATTERN.test(userId)) throw ApiError.notFound('That person no longer exists.');
  const target = await usersRepo.findById(userId);
  if (!target) throw ApiError.notFound('That person no longer exists.');
  return { target, isSelf: target.userId === actorUserId };
}

export default async function usersRoutes(app: FastifyInstance) {

  app.get<{ Querystring: { role?: 'student' | 'guard' | 'admin' } }>('/users', async (request) => {
    request.requireRole('admin', 'guard');
    return (await usersRepo.list(request.query.role)).map((user) => withoutPending(user));
  });

    app.post('/users', async (request, reply) => {
    const actor = request.requireRole('admin');
    const body = createUserSchema.parse(request.body);
    const passwordHash = await hashPassword(body.password);

    try {
      const user = await withTransaction(async () => {
        const created = await usersRepo.create({
          studentNumber: body.studentStaffNumber,
          name: body.name,
          email: body.email,
          role: body.role,
          passwordHash,
        });
        await auditRepo.record({
          actorUserId: actor.userId,
          action: 'user.created',
          entityType: 'user',
          entityId: created.userId,
          detail: `${created.name} (${created.role}) was added with number ${created.studentStaffNumber}.`,
        });
        return created;
      });
      reply.status(201);
      return withoutPending(user);
    } catch (err) {
      const pgError = err as { code?: string; constraint?: string };
      if (pgError.code === '23505') {
        if (pgError.constraint === 'users_email_key') {
          throw ApiError.conflict('That email address is already in use.', 'email');
        }
        throw ApiError.conflict('Someone with that student or staff number already exists.', 'studentStaffNumber');
      }
      throw err;
    }
  });

    app.patch<{ Params: { userId: string } }>('/users/:userId', async (request) => {
    const actor = request.requireRole('admin');
    const { target, isSelf } = await requireManageableUser(request, actor.userId);
    const fields = parseAdminEdit(request.body);

    if (isSelf && fields.role !== target.role) {
      throw new ApiError(400, 'cannot_change_own_role', 'You cannot change your own role.', 'role');
    }

    try {
      return await withTransaction(async () => {
        const updated = await usersRepo.adminUpdate(target.userId, fields);
        if (!updated) throw ApiError.notFound('That person no longer exists.');
        if (fields.studentNumber !== target.studentStaffNumber) {
          await query(
            'UPDATE bike_permissions SET authorised_student_number = $2 WHERE authorised_user_id = $1',
            [target.userId, fields.studentNumber],
          );
        }
        await auditRepo.record({
          actorUserId: actor.userId,
          action: 'user.updated',
          entityType: 'user',
          entityId: target.userId,
          detail: `${updated.name} (${updated.role}, ${updated.studentStaffNumber}) was edited.`,
        });
        return updated;
      });
    } catch (err) {
      const pgError = err as { code?: string; constraint?: string };
      if (pgError.code === '23505') {
        if (pgError.constraint === 'users_email_key') {
          throw ApiError.conflict('That email address is already in use.', 'email');
        }
        if (pgError.constraint === 'users_student_number_key') {
          throw ApiError.conflict('Someone with that student or staff number already exists.', 'studentStaffNumber');
        }
      }
      throw err;
    }
  });

  app.post<{ Params: { userId: string } }>('/users/:userId/deactivate', async (request) => {
    const actor = request.requireRole('admin');
    const { target, isSelf } = await requireManageableUser(request, actor.userId);
    if (isSelf) throw new ApiError(400, 'cannot_modify_self', 'You cannot deactivate your own account.');
    if (target.accountStatus === 'suspended') return target;

    const reason = (request.body as { reason?: unknown } | null | undefined)?.reason;
    const note = typeof reason === 'string' && reason.trim() ? ` Reason: ${reason.trim()}` : '';
    return withTransaction(async () => {
      const updated = await usersRepo.setAccountStatus(target.userId, 'suspended');
      await auditRepo.record({
        actorUserId: actor.userId,
        action: 'user.deactivated',
        entityType: 'user',
        entityId: target.userId,
        detail: `${target.name}'s account was deactivated.${note}`,
      });
      return updated!;
    });
  });

  app.post<{ Params: { userId: string } }>('/users/:userId/reactivate', async (request) => {
    const actor = request.requireRole('admin');
    const { target } = await requireManageableUser(request, actor.userId);
    if (target.accountStatus === 'active') return target;

    return withTransaction(async () => {
      const updated = await usersRepo.setAccountStatus(target.userId, 'active');
      await auditRepo.record({
        actorUserId: actor.userId,
        action: 'user.reactivated',
        entityType: 'user',
        entityId: target.userId,
        detail: `${target.name}'s account was reactivated.`,
      });
      return updated!;
    });
  });

  app.delete<{ Params: { userId: string } }>('/users/:userId', async (request, reply) => {
    const actor = request.requireRole('admin');
    const { target, isSelf } = await requireManageableUser(request, actor.userId);
    if (isSelf) throw new ApiError(400, 'cannot_modify_self', 'You cannot remove your own account.');

    try {
      await withTransaction(async () => {
        await auditRepo.record({
          actorUserId: actor.userId,
          action: 'user.removed',
          entityType: 'user',
          entityId: target.userId,
          detail: `${target.name} (${target.role}, ${target.studentStaffNumber}) was removed.`,
        });
        await usersRepo.remove(target.userId);
      });
    } catch (err) {
      if ((err as { code?: string }).code === '23503') {
        throw new ApiError(
          409,
          'has_records',
          `${target.name} still has bikes or other records, so they cannot be removed. Deactivate them instead.`,
        );
      }
      throw err;
    }
    reply.status(204);
    return reply.send();
  });

    app.patch('/users/me', async (request) => {
    const actor = request.requireAuth();
    const details = parseOwnDetails(request.body);
    try {
      const updated = await usersRepo.updateDetails(actor.userId, details);
      if (!updated) throw ApiError.unauthenticated();
      await auditRepo.record({
        actorUserId: actor.userId,
        action: 'profile.updated',
        entityType: 'user',
        entityId: actor.userId,
        detail: 'Name, email, and phone updated.',
      });
      return updated;
    } catch (err) {
      const pgError = err as { code?: string; constraint?: string };
      if (pgError.code === '23505' && pgError.constraint === 'users_email_key') {
        throw ApiError.conflict('That email address is already in use.', 'email');
      }
      throw err;
    }
  });

  app.post('/users/me/password', {
    config: {
      rateLimit: {
        max: config.loginRateLimitMax,
        timeWindow: config.loginRateLimitWindow,
        keyGenerator: (request: FastifyRequest) => `pw:${request.authUser?.userId ?? request.ip}`,
      },
    },
  }, async (request) => {
    const actor = request.requireAuth();
    const input = (request.body ?? {}) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof input.currentPassword === 'string' ? input.currentPassword : '';
    const newPassword = typeof input.newPassword === 'string' ? input.newPassword : '';

    if (!currentPassword) {
      throw new ApiError(400, 'current_password_required', 'Enter your current password.', 'currentPassword');
    }
    if (newPassword.length < 8) {
      throw new ApiError(400, 'invalid_password', 'Passwords must be at least 8 characters.', 'newPassword');
    }
    const user = await usersRepo.findByIdWithPassword(actor.userId);
    if (!user) throw ApiError.unauthenticated();
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new ApiError(400, 'invalid_current_password', 'That is not your current password.', 'currentPassword');
    }
    await usersRepo.setPasswordHash(user.userId, await hashPassword(newPassword));
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'profile.password_changed',
      entityType: 'user',
      entityId: actor.userId,
      detail: 'Password changed.',
    });
    return { success: true };
  });

  app.post('/users/me/photo', async (request) => {
    const actor = request.requireAuth();
    const input = (request.body ?? {}) as { photoDataUrl?: unknown };
    const pendingPhotoUrl = await savePhotoDataUrl(input.photoDataUrl, 'users', actor.userId);
    await photosRepo.submit('user', actor.userId, pendingPhotoUrl);
    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'profile.photo_submitted',
      entityType: 'user',
      entityId: actor.userId,
      detail: 'Profile photo submitted for review.',
    });
    const user = await usersRepo.findById(actor.userId);
    if (!user) throw ApiError.unauthenticated();
    return user;
  });

  app.get<{ Params: { studentNumber: string } }>('/users/lookup/:studentNumber', async (request) => {
    request.requireRole('admin', 'guard');
    const user = await usersRepo.findByStudentNumber(request.params.studentNumber);
    return user;
  });

  app.get<{ Params: { userId: string } }>('/users/:userId/bikes', async (request) => {
    requireOwnerOrRoles(request, request.params.userId, 'admin');
    const bikes = await bikesRepo.listForOwner(request.params.userId);
    return toBikeViews(bikes);
  });

  app.get<{ Params: { userId: string } }>('/users/:userId/notifications', async (request) => {
    requireOwnerOrRoles(request, request.params.userId, 'admin');
    return notificationsRepo.listForUser(request.params.userId);
  });

  const markReadSchema = z.object({ read: z.boolean().default(true) });
  app.patch<{ Params: { notificationId: string } }>('/notifications/:notificationId', async (request, reply) => {
    request.requireAuth();
    markReadSchema.parse(request.body ?? {});
    const notification = await notificationsRepo.findById(request.params.notificationId);
    if (!notification) throw ApiError.notFound('That notification no longer exists.');
    requireOwnerOrRoles(request, notification.userId, 'admin');
    await notificationsRepo.markRead(request.params.notificationId);
    return reply.status(204).send();
  });
}
