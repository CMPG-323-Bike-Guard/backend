import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireOwnerOrRoles } from '../auth-plugin';
import { ApiError } from '../errors';
import { bikesRepo } from '../repositories/bikes.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { usersRepo } from '../repositories/users.repo';
import { toBikeViews } from '../services/views';
import { withTransaction } from '../db';
import { auditRepo } from '../repositories/audit.repo';
import { hashPassword } from '../security';

const createUserSchema = z.object({
  studentStaffNumber: z.string().trim().regex(/^\d{8}$/, 'A student or staff number is 8 digits.'),
  name: z.string().trim().min(2, 'Enter the full name.').max(80, 'Names are at most 80 characters.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  role: z.enum(['student', 'guard', 'admin']),
  password: z.string().min(8, 'Passwords are at least 8 characters.'),
});

export default async function usersRoutes(app: FastifyInstance) {

  app.get<{ Querystring: { role?: 'student' | 'guard' | 'admin' } }>('/users', async (request) => {
    request.requireRole('admin', 'guard');
    return usersRepo.list(request.query.role);
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
      return user;
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
