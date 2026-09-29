import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  field?: string;

  constructor(statusCode: number, code: string, message: string, field?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
  }

  static notFound(message = 'That resource no longer exists.'): ApiError {
    return new ApiError(404, 'not_found', message);
  }

  static badRequest(message: string, field?: string): ApiError {
    return new ApiError(400, 'invalid', message, field);
  }

  static conflict(message: string, field?: string): ApiError {
    return new ApiError(409, 'conflict', message, field);
  }

  static unauthenticated(message = 'Your session has expired. Sign in again.'): ApiError {
    return new ApiError(401, 'unauthenticated', message);
  }

  static forbidden(message = 'You do not have permission to do that.'): ApiError {
    return new ApiError(403, 'forbidden', message);
  }
}

export function registerErrorHandler(app: {
  setErrorHandler: (fn: (error: FastifyError | Error, req: FastifyRequest, reply: FastifyReply) => void) => void;
}) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send({ code: error.code, message: error.message, field: error.field });
      return;
    }
    if (error instanceof ZodError) {
      const first = error.issues[0];
      reply.status(400).send({
        code: 'invalid',
        message: first?.message ?? 'Invalid request.',
        field: first?.path?.join('.') || undefined,
      });
      return;
    }
    const fastifyError = error as FastifyError;
    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      reply.status(fastifyError.statusCode).send({ code: fastifyError.code ?? 'invalid', message: error.message });
      return;
    }
    request.log.error(error);
    reply.status(500).send({ code: 'internal_error', message: 'Something went wrong.' });
  });
}
