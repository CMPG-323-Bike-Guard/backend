import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from './config';
import { ApiError } from './errors';
import { usersRepo } from './repositories/users.repo';
import type { Role, User } from './types';

export interface AuthedUser {
  userId: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthedUser | null;
  }
}

export function signToken(user: User): string {
  return jwt.sign({ sub: user.userId, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

function extractToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('authUser', null);

  app.addHook('onRequest', async (request) => {
    const token = extractToken(request);
    if (!token) return;
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string; role: Role };
      const state = await usersRepo.findAuthState(payload.sub);
      if (state && state.accountStatus === 'active') {
        request.authUser = { userId: payload.sub, role: state.role };
      }
    } catch {

    }
  });

  app.decorateRequest('requireAuth', function requireAuth(this: FastifyRequest): AuthedUser {
    if (!this.authUser) throw ApiError.unauthenticated();
    return this.authUser;
  });

  app.decorateRequest('requireRole', function requireRole(this: FastifyRequest, ...roles: Role[]): AuthedUser {
    const user = requireAuthHelper(this);
    if (!roles.includes(user.role)) throw ApiError.forbidden();
    return user;
  });
});

function requireAuthHelper(request: FastifyRequest): AuthedUser {
  if (!request.authUser) throw ApiError.unauthenticated();
  return request.authUser;
}

declare module 'fastify' {
  interface FastifyRequest {
    requireAuth(): AuthedUser;
    requireRole(...roles: Role[]): AuthedUser;
  }
}

export function requireOwnerOrRoles(request: FastifyRequest, resourceUserId: string, ...roles: Role[]): AuthedUser {
  const user = requireAuthHelper(request);
  if (user.userId === resourceUserId || roles.includes(user.role)) return user;
  throw ApiError.forbidden();
}

export function reply204(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}
