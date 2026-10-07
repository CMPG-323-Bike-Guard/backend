import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import { auditRepo } from '../repositories/audit.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { eventsRepo, type CrossingFilters } from '../repositories/events.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { usersRepo } from '../repositories/users.repo';
import { emitRealtime } from '../realtime';
import { toCrossingView, toCrossingViews } from '../services/views';
import type { CrossingResult } from '../types';

const manualCrossingSchema = z.object({
  gateId: z.string().uuid(),
  studentNumber: z.string().min(1, "Enter the student's number."),
  bikeDescription: z.string().min(1, 'Describe the bike being let through.'),
  note: z.string().default(''),
});

export default async function crossingsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { gateId?: string; result?: CrossingResult; query?: string; from?: string; to?: string; limit?: string };
  }>('/crossings', async (request) => {
    request.requireRole('guard', 'admin');
    const q = request.query;
    const filters: CrossingFilters = {
      gateId: q.gateId,
      result: q.result,
      query: q.query,
      from: q.from,
      to: q.to,
      limit: q.limit ? Number(q.limit) : undefined,
    };
    const events = await eventsRepo.list(filters);
    let views = await toCrossingViews(events);

    if (q.query) {
      const needle = q.query.toLowerCase();
      views = views.filter(
        (v) =>
          v.userName?.toLowerCase().includes(needle) ||
          v.studentStaffNumber?.toLowerCase().includes(needle) ||
          v.bikeName?.toLowerCase().includes(needle) ||
          v.event.studentNumber?.toLowerCase().includes(needle) ||
          v.event.tagRef?.toLowerCase().includes(needle),
      );
    }
    return views;
  });

  app.post('/crossings/manual', async (request) => {
    const actor = request.requireRole('guard', 'admin');
    const body = manualCrossingSchema.parse(request.body);

    const gate = await gatesRepo.findById(body.gateId);
    if (!gate) throw ApiError.notFound('That gate is not configured.');
    const student = await usersRepo.findByStudentNumber(body.studentNumber);
    if (!student) throw ApiError.badRequest('No student matches that number.', 'studentNumber');
    const ownedBikes = await bikesRepo.listForOwner(student.userId);
    const activeBike = ownedBikes.find((bike) => bike.status === 'active') ?? ownedBikes[0] ?? null;

    const event = await eventsRepo.create({
      gateId: gate.gateId,
      userId: student.userId,
      bikeId: activeBike?.bikeId ?? null,
      studentNumber: student.studentStaffNumber,
      tagRef: null,
      result: 'manual',
      mismatchReason: null,
      source: 'manual_entry',
      guardUserId: actor.userId,
      verificationMs: null,
      offline: gate.mode === 'manual',
      note: `${body.bikeDescription.trim()}${body.note.trim() ? ` — ${body.note.trim()}` : ''}`,
    });

    await auditRepo.record({
      actorUserId: actor.userId,
      action: 'crossing.manual',
      entityType: 'gate_event',
      entityId: event.eventId,
      detail: `Manually logged ${student.name} at ${gate.name}: ${body.bikeDescription.trim()}.`,
    });

    const crossing = await toCrossingView(event);
    emitRealtime({ type: 'crossing', crossing });
    return crossing;
  });
}
