import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireOwnerOrRoles } from '../auth-plugin';
import { ApiError } from '../errors';
import { bikesRepo } from '../repositories/bikes.repo';
import { notificationsRepo } from '../repositories/notifications.repo';
import { usersRepo } from '../repositories/users.repo';
import { toBikeViews } from '../services/views';

export default async function usersRoutes(app: FastifyInstance) {

  app.get<{ Querystring: { role?: 'student' | 'guard' | 'admin' } }>('/users', async (request) => {
    request.requireRole('admin', 'guard');
    return usersRepo.list(request.query.role);
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
