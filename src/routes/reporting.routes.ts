import type { FastifyInstance } from 'fastify';
import { auditRepo } from '../repositories/audit.repo';
import { buildReports, buildStats } from '../services/stats';

export default async function reportingRoutes(app: FastifyInstance) {

  app.get('/reports/stats', async (request) => {
    request.requireRole('guard', 'admin');
    return buildStats();
  });

  app.get<{ Querystring: { days?: string } }>('/reports', async (request) => {
    request.requireRole('admin');
    const days = Math.min(90, Math.max(1, Number(request.query.days) || 30));
    return buildReports(days);
  });

  app.get<{ Querystring: { limit?: string } }>('/audit', async (request) => {
    request.requireRole('admin');
    const limit = Math.min(200, Math.max(1, Number(request.query.limit) || 40));
    return auditRepo.list(limit);
  });
}
