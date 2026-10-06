import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { signToken } from '../auth-plugin';
import { config } from '../config';
import { ApiError } from '../errors';
import { usersRepo } from '../repositories/users.repo';
import { verifyPassword } from '../security';
import type { Session } from '../types';

const loginSchema = z.object({
  studentStaffNumber: z.string().min(1, 'Enter your student/staff number.'),
  password: z.string().min(1, 'Enter your password.'),
});

export default async function authRoutes(app: FastifyInstance) {

   app.post('/auth/login', {
    config: {
      rateLimit: {
        max: config.loginRateLimitMax,
        timeWindow: config.loginRateLimitWindow,
        keyGenerator: (request: FastifyRequest) => {
          const number = (request.body as { studentStaffNumber?: unknown } | null)?.studentStaffNumber;
          return `${request.ip}:${typeof number === 'string' ? number.trim() : ''}`;
        },
        errorResponseBuilder: (_request: FastifyRequest, context: { after: string }) => ({
          statusCode: 429,
          code: 'rate_limited',
          message: `Too many sign-in attempts. Try again in ${context.after}.`,
        }),
      },
    },
  }, async (request): Promise<Session> => {
    const body = loginSchema.parse(request.body);
    const user = await usersRepo.findByStudentNumberWithPassword(body.studentStaffNumber);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, 'invalid_credentials', 'That student/staff number and password do not match.');
    }
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, 'account_suspended', 'This account is suspended. Contact the IT service desk.');
    }
    const { passwordHash: _drop, ...publicUser } = user;
    return { token: signToken(publicUser), user: publicUser };
  });

  app.get('/auth/session', async (request): Promise<Session> => {
    const authed = request.requireAuth();
    const user = await usersRepo.findById(authed.userId);
    if (!user) throw ApiError.unauthenticated();
    const header = request.headers.authorization!;
    return { token: header.slice('Bearer '.length), user };
  });
}
