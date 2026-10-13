import { withTransaction } from '../db';
import { config } from '../config';
import { alarmsRepo } from '../repositories/alarms.repo';
import { auditRepo } from '../repositories/audit.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { eventsRepo } from '../repositories/events.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { permissionsRepo } from '../repositories/permissions.repo';
import { tagsRepo } from '../repositories/tags.repo';
import { usersRepo } from '../repositories/users.repo';
import { ApiError } from '../errors';
import { emitRealtime } from '../realtime';
import { displayRef, hmacIdentifier } from '../security';
import { toCrossingView, buildAlarmView } from './views';
import type { CrossingView, GateEvent, MismatchReason } from '../types';

export interface CrossingInput {
  gateId: string;
  studentNumber?: string | null;
  tagUid?: string | null;
  source?: 'automated' | 'manual_entry' | 'guard_override';
  debounce?: boolean;
}

export interface CrossingOutcome {
  crossing: CrossingView;
  gateShouldOpen: boolean;
  alarmRaised: boolean;
  duplicate?: boolean;
}

interface RecentScan {
  at: number;
  promise: Promise<CrossingOutcome>;
}

const recentScans = new Map<string, RecentScan>();

export function clearRecentScans(): void {
  recentScans.clear();
}

const STUDENT_NUMBER_PATTERN = /^\d{8}$/;

function normaliseStudentNumber(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? '';
  return STUDENT_NUMBER_PATTERN.test(trimmed) ? trimmed : null;
}

function scanKey(gateId: string, studentNumber: string | null, tagUid: string | null): string {
  return [gateId, studentNumber ?? '-', tagUid ? hmacIdentifier(tagUid) : '-'].join('|');
}

function pruneRecentScans(now: number): void {
  for (const [key, entry] of recentScans) {
    if (now - entry.at >= config.scanDebounceMs) recentScans.delete(key);
  }
}

export async function processCrossing(input: CrossingInput): Promise<CrossingOutcome> {
  const studentNumber = normaliseStudentNumber(input.studentNumber);
  const tagUid = input.tagUid?.trim() || null;
  const source = input.source ?? 'automated';
  const debounce = source === 'automated' && input.debounce !== false && config.scanDebounceMs > 0;

  if (!debounce) return evaluateCrossing(input.gateId, studentNumber, tagUid, source);

  const now = Date.now();
  pruneRecentScans(now);
  const key = scanKey(input.gateId, studentNumber, tagUid);
  const existing = recentScans.get(key);
  if (existing) {
    const outcome = await existing.promise;
    return { ...outcome, duplicate: true };
  }

  const promise = evaluateCrossing(input.gateId, studentNumber, tagUid, source);
  recentScans.set(key, { at: now, promise });
  try {
    return await promise;
  } catch (err) {
    recentScans.delete(key);
    throw err;
  }
}

async function evaluateCrossing(
  gateId: string,
  studentNumber: string | null,
  tagUid: string | null,
  source: NonNullable<CrossingInput['source']>,
): Promise<CrossingOutcome> {
  const startedAt = Date.now();
  const gate = await gatesRepo.findById(gateId);
  if (!gate) throw ApiError.notFound('That gate is not configured.');
  if (gate.mode === 'manual') {
    throw new ApiError(409, 'gate_manual', 'This gate is in manual mode. Switch it back to automated first.');
  }

  let userId: string | null = null;
  let bikeId: string | null = null;
  let tagRefOut: string | null = null;
  let mismatchReason: MismatchReason | null = null;

  if (!studentNumber || !tagUid) {
    mismatchReason = 'incomplete_read';
    if (tagUid) tagRefOut = displayRef('BG', hmacIdentifier(tagUid));
  } else {
    const tagHmac = hmacIdentifier(tagUid);
    tagRefOut = displayRef('BG', tagHmac);

    const [person, tag] = await Promise.all([usersRepo.findByStudentNumber(studentNumber), tagsRepo.findByHmac(tagHmac)]);
    userId = person?.userId ?? null;

    if (!tag) {
      mismatchReason = 'tag_not_registered';
    } else if (tag.status === 'deactivated' || tag.status === 'awaiting_collection') {
      mismatchReason = 'tag_deactivated';
      bikeId = tag.bikeId;
    } else if (tag.status === 'lost') {
      mismatchReason = 'tag_reported_lost';
      bikeId = tag.bikeId;
    } else if (tag.status === 'stolen') {
      mismatchReason = 'tag_reported_stolen';
      bikeId = tag.bikeId;
    } else {
      bikeId = tag.bikeId;
      const bike = await bikesRepo.findById(tag.bikeId);
      const accountActive = !!person && person.accountStatus === 'active';
      const ownsIt = accountActive && !!bike && person.userId === bike.ownerUserId;
              // A guest only needs the student number on their card; a BikeGuard account is optional,
        // but if they do have one it must not be suspended.
        const guestAllowed = !person || person.accountStatus === 'active';
        const hasPermission =
          !ownsIt && guestAllowed && bike && studentNumber
            ? !!(await permissionsRepo.findActive(bike.bikeId, studentNumber))
            : false;
      if (!bike || !(ownsIt || hasPermission)) mismatchReason = 'tag_registered_to_other_user';
    }
  }

  const isMatch = mismatchReason === null;
  const verificationMs = Date.now() - startedAt;

  const { event, alarm } = await withTransaction(async () => {
    const created: GateEvent = await eventsRepo.create({
      gateId: gate.gateId,
      userId,
      bikeId,
      studentNumber,
      tagRef: tagRefOut,
      result: isMatch ? 'match' : 'mismatch',
      mismatchReason,
      source,
      guardUserId: null,
      verificationMs,
      offline: false,
      note: null,
    });

    const raised = isMatch ? null : await alarmsRepo.create(created.eventId, new Date(Date.now() + config.alarmAckTimeoutMs));

    await auditRepo.record({
      actorUserId: userId,
      action: isMatch ? 'crossing.match' : 'crossing.mismatch',
      entityType: 'gate_event',
      entityId: created.eventId,
      detail: isMatch
        ? `Match at ${gate.name} in ${verificationMs}ms.`
        : `Mismatch at ${gate.name}: ${mismatchReason}.`,
    });

    return { event: created, alarm: raised };
  });

  if (alarm) emitRealtime({ type: 'alarm', alarm: await buildAlarmView(alarm) });

  const crossing = await toCrossingView(event);
  emitRealtime({ type: 'crossing', crossing });

  return { crossing, gateShouldOpen: isMatch, alarmRaised: alarm !== null };
}