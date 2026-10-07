import { alarmsRepo } from '../repositories/alarms.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { eventsRepo } from '../repositories/events.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { usersRepo } from '../repositories/users.repo';
import type { DashboardStats, GateEvent, MismatchReason, ReportBundle, RepeatMismatchRow, SeriesPoint } from '../types';

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

export async function buildStats(): Promise<DashboardStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [today, allEvents, gates, bikes] = await Promise.all([
    eventsRepo.listSince(startOfDay),
    eventsRepo.listAll(),
    gatesRepo.list(),
    bikesRepo.listByStatus(),
  ]);
  const alarms = await alarmsRepo.list('all');

  const durations = allEvents
    .map((event) => event.verificationMs)
    .filter((value): value is number => typeof value === 'number');
  const automated = allEvents.filter((event) => event.source === 'automated');
  const incomplete = automated.filter((event) => event.mismatchReason === 'incomplete_read');

  return {
    crossingsToday: today.length,
    matchesToday: today.filter((event) => event.result === 'match').length,
    mismatchesToday: today.filter((event) => event.result === 'mismatch').length,
    openAlarms: alarms.filter((alarm) => alarm.status === 'open' || alarm.status === 'escalated').length,
    manualGates: gates.filter((gate) => gate.mode === 'manual').length,
    registeredBikes: bikes.filter((bike) => bike.status === 'active').length,
    pendingRegistrations: bikes.filter((bike) => bike.status === 'pending_approval').length,
    medianVerificationMs: percentile(durations, 0.5),
    p95VerificationMs: percentile(durations, 0.95),
    readSuccessRate: automated.length === 0 ? 100 : 100 - (incomplete.length / automated.length) * 100,
  };
}

export async function buildReports(days: number): Promise<ReportBundle> {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const [scoped, bikes] = await Promise.all([eventsRepo.listSince(cutoff), bikesRepo.listByStatus()]);
  const usersById = new Map<string, Awaited<ReturnType<typeof usersRepo.findById>>>();
  const userIds = [...new Set(scoped.map((event) => event.userId).filter((id): id is string => !!id))];
  await Promise.all(
    userIds.map(async (id) => {
      usersById.set(id, await usersRepo.findById(id));
    }),
  );

  const byDay = new Map<string, SeriesPoint>();
  const byHour = new Map<number, SeriesPoint>();

  const bucket = (event: GateEvent) => {
    if (event.result === 'match') return 'matches' as const;
    if (event.result === 'mismatch') return 'mismatches' as const;
    return 'manual' as const;
  };

  scoped.forEach((event) => {
    const date = new Date(event.timestamp);
    const dayKey = date.toISOString().slice(0, 10);
    const dayLabel = date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
    const day = byDay.get(dayKey) ?? { label: dayLabel, matches: 0, mismatches: 0, manual: 0 };
    const hourKey = date.getHours();
    const hour = byHour.get(hourKey) ?? {
      label: `${hourKey.toString().padStart(2, '0')}:00`,
      matches: 0,
      mismatches: 0,
      manual: 0,
    };
    day[bucket(event)] += 1;
    hour[bucket(event)] += 1;
    byDay.set(dayKey, day);
    byHour.set(hourKey, hour);
  });

  const repeats = new Map<string, RepeatMismatchRow>();
  scoped
    .filter((event) => event.result === 'mismatch')
    .forEach((event) => {
      const user = event.userId ? usersById.get(event.userId) : null;
      const key = user?.userId ?? `unidentified:${event.studentNumber ?? event.tagRef ?? event.eventId}`;
      const row: RepeatMismatchRow =
        repeats.get(key) ?? {
          userId: user?.userId ?? null,
          name: user?.name ?? 'Unidentified person',
          studentStaffNumber: user?.studentStaffNumber ?? '—',
          count: 0,
          lastSeen: event.timestamp,
          reasons: [],
        };
      row.count += 1;
      row.lastSeen = event.timestamp > row.lastSeen ? event.timestamp : row.lastSeen;
      const reason = event.mismatchReason as MismatchReason | null;
      if (reason && !row.reasons.includes(reason)) row.reasons.push(reason);
      repeats.set(key, row);
    });

  const uptake: Array<{ label: string; registered: number }> = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const edge = Date.now() - offset * 86_400_000;
    uptake.push({
      label: new Date(edge).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
      registered: bikes.filter((bike) => bike.status === 'active' && new Date(bike.submittedAt).getTime() <= edge)
        .length,
    });
  }

  return {
    stats: await buildStats(),
    throughputByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
    throughputByHour: [...byHour.entries()].sort(([a], [b]) => a - b).map(([, v]) => v),
    repeatMismatches: [...repeats.values()].filter((row) => row.count > 1).sort((a, b) => b.count - a.count),
    registrationUptake: uptake,
  };
}
