import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import path from 'node:path';
import { authPlugin } from './auth-plugin';
import { config } from './config';
import { registerErrorHandler } from './errors';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import bikesRoutes from './routes/bikes.routes';
import registrationsRoutes from './routes/registrations.routes';
import tagsRoutes from './routes/tags.routes';
import gatesRoutes from './routes/gates.routes';
import crossingsRoutes from './routes/crossings.routes';
import alarmsRoutes from './routes/alarms.routes';
import reportingRoutes from './routes/reporting.routes';
import devRoutes from './routes/dev.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isProduction ? true : { transport: { target: 'pino-pretty' } },
    trustProxy: config.trustProxy,
  });


    // Browsers and tools sometimes send `Content-Type: application/json` with no body (e.g. POST /bikes/:id/submit).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    if (!body || (body as string).trim() === '') return done(null, undefined);
    try {
      done(null, JSON.parse(body as string));
    } catch {
      const err = new Error('Body is not valid JSON.') as Error & { statusCode: number };
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), config.uploadsDir),
    prefix: `${config.publicUploadsPath}/`,
  });
  await app.register(rateLimit, { global: false, hook: 'preHandler' });
  await app.register(authPlugin);
  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(usersRoutes);
      await api.register(bikesRoutes);
      await api.register(registrationsRoutes);
      await api.register(tagsRoutes);
      await api.register(gatesRoutes);
      await api.register(crossingsRoutes);
      await api.register(alarmsRoutes);
      await api.register(reportingRoutes);
      await api.register(devRoutes);
    },
    { prefix: config.apiPrefix },
  );

  return app;
}
