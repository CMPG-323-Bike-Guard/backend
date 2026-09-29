import { alarmsRepo } from '../repositories/alarms.repo';
import { auditRepo } from '../repositories/audit.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { cardsRepo } from '../repositories/cards.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { tagsRepo } from '../repositories/tags.repo';
import { ApiError } from '../errors';
import { emitRealtime } from '../realtime';
import { displayRef, hmacIdentifier } from '../security';
import { toCrossingView, buildAlarmView } from './views';
import type { CrossingView, GateEvent, MismatchReason } from '../types';

export interface CrossingInput {
  gateId: string;
    cardUid?: string | null;
    tagUid?: string | null;
  source?: 'automated' | 'manual_entry' | 'guard_override';
}

export interface CrossingOutcome {
  crossing: CrossingView;
  gateShouldOpen: boolean;
  alarmRaised: boolean;
}

export async function processCrossing(input: CrossingInput): Promise<CrossingOutcome> {
  const startedAt = Date.now();
  const gate = await gatesRepo.findById(input.gateId);
  if (!gate) throw ApiError.notFound('That gate is not configured.');
  if (gate.mode === 'manual') {
    throw new ApiError(409, 'gate_manual', 'This gate is in manual mode. Switch it back to automated first.');
  }

  const cardUid = input.cardUid?.trim() || null;
  const tagUid = input.tagUid?.trim() || null;

  let userId: string | null = null;
  let bikeId: string | null = null;
  let cardRefOut: string | null = null;
  let tagRefOut: string | null = null;
  let mismatchReason: MismatchReason | null = null;

  if (!cardUid || !tagUid) {
    mismatchReason = 'incomplete_read';
    if (cardUid) cardRefOut = displayRef('CRD', hmacIdentifier(cardUid));
    if (tagUid) tagRefOut = displayRef('BG', hmacIdentifier(tagUid));
  } else {
    const cardHmac = hmacIdentifier(cardUid);
    const tagHmac = hmacIdentifier(tagUid);
    cardRefOut = displayRef('CRD', cardHmac);
    tagRefOut = displayRef('BG', tagHmac);

    const [card, tag] = await Promise.all([cardsRepo.findByHmac(cardHmac), tagsRepo.findByHmac(tagHmac)]);
    userId = card?.userId ?? null;

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

      const bike = await bikesRepo.findById(tag.bikeId);
      const ownsIt = !!card && !!bike && card.userId === bike.ownerUserId;
      const hasPermission = !ownsIt && card && bike ? await hasActivePermission(bike.bikeId, card.userId) : false;
      if (bike && (ownsIt || hasPermission)) {
        bikeId = bike.bikeId;
      } else {
        mismatchReason = 'tag_registered_to_other_user';
        bikeId = tag.bikeId;
      }
    }
  }

  const isMatch = mismatchReason === null;
  const verificationMs = Date.now() - startedAt;

  const { eventsRepo } = await import('../repositories/events.repo');
  const event: GateEvent = await eventsRepo.create({
    gateId: gate.gateId,
    userId,
    bikeId: isMatch ? bikeId : bikeId,
    cardRef: cardRefOut,
    tagRef: tagRefOut,
    result: isMatch ? 'match' : 'mismatch',
    mismatchReason,
    source: input.source ?? 'automated',
    guardUserId: null,
    verificationMs,
    offline: false,
    note: null,
  });

  let alarmRaised = false;
  if (!isMatch) {
    const alarm = await alarmsRepo.create(event.eventId);
    alarmRaised = true;
    const alarmView = await buildAlarmView(alarm);
    emitRealtime({ type: 'alarm', alarm: alarmView });
  }

  await auditRepo.record({
    actorUserId: userId,
    action: isMatch ? 'crossing.match' : 'crossing.mismatch',
    entityType: 'gate_event',
    entityId: event.eventId,
    detail: isMatch
      ? `Match at ${gate.name} in ${verificationMs}ms.`
      : `Mismatch at ${gate.name}: ${mismatchReason}.`,
  });

  const crossing = await toCrossingView(event);
  emitRealtime({ type: 'crossing', crossing });

  return { crossing, gateShouldOpen: isMatch, alarmRaised };
}

async function hasActivePermission(bikeId: string, authorisedUserId: string): Promise<boolean> {
  const { permissionsRepo } = await import('../repositories/permissions.repo');
  const permission = await permissionsRepo.findActive(bikeId, authorisedUserId);
  return !!permission;
}
