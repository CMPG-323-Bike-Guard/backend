import { alarmsRepo } from '../repositories/alarms.repo';
import { bikesRepo } from '../repositories/bikes.repo';
import { eventsRepo } from '../repositories/events.repo';
import { gatesRepo } from '../repositories/gates.repo';
import { permissionsRepo } from '../repositories/permissions.repo';
import { tagsRepo } from '../repositories/tags.repo';
import { usersRepo } from '../repositories/users.repo';
import { query } from '../db';
import { ApiError } from '../errors';
import type {
  Alarm,
  AlarmView,
  Bike,
  BikeView,
  CrossingView,
  GateEvent,
  PermissionView,
  RfidTag,
  TagStatus,
  User,
} from '../types';

async function toPermissionViews(bikeId: string): Promise<PermissionView[]> {
  const permissions = await permissionsRepo.listForBike(bikeId);
  return Promise.all(
    permissions.map(async (permission) => {
            const user = permission.authorisedUserId
        ? await usersRepo.findById(permission.authorisedUserId)
        : await usersRepo.findByStudentNumber(permission.authorisedStudentNumber);
      return {
        ...permission,
        authorisedUserName: user?.name ?? permission.authorisedName ?? `Student ${permission.authorisedStudentNumber}`,
      };
    }),
  );
}

export async function toBikeView(bike: Bike): Promise<BikeView> {
  const [tag, owner, permissions] = await Promise.all([
    tagsRepo.findForBike(bike.bikeId),
    usersRepo.findById(bike.ownerUserId),
    toPermissionViews(bike.bikeId),
  ]);
  if (!owner) throw ApiError.notFound('The owner of this bike no longer exists.');
  return { bike, tag, owner, permissions };
}

export async function toBikeViews(bikes: Bike[]): Promise<BikeView[]> {
  return Promise.all(bikes.map(toBikeView));
}

export async function toCrossingView(event: GateEvent): Promise<CrossingView> {
  const [gate, user, bike, alarm] = await Promise.all([
    gatesRepo.findById(event.gateId),
    event.userId ? usersRepo.findById(event.userId) : Promise.resolve(null),
    event.bikeId ? bikesRepo.findById(event.bikeId) : Promise.resolve(null),
    alarmsRepo.findByEventId(event.eventId),
  ]);
  return {
    event,
    gateName: gate?.name ?? 'Unknown gate',
    userName: user?.name ?? null,
    studentStaffNumber: user?.studentStaffNumber ?? null,
    bikeName: bike?.name ?? null,
    alarmStatus: alarm?.status ?? null,
  };
}

export async function toCrossingViews(events: GateEvent[]): Promise<CrossingView[]> {
  return Promise.all(events.map(toCrossingView));
}

async function findTagByRef(tagRef: string): Promise<RfidTag | null> {
  interface Row {
    tag_id: string;
    bike_id: string;
    tag_ref: string;
    status: TagStatus;
    issued_at: string | null;
    deactivated_at: string | null;
    replaces_tag_id: string | null;
  }
  const rows = await query<Row>('SELECT * FROM rfid_tags WHERE tag_ref = $1', [tagRef]);
  const row = rows[0];
  if (!row) return null;
  return {
    tagId: row.tag_id,
    bikeId: row.bike_id,
    tagRef: row.tag_ref,
    status: row.status,
    issuedAt: row.issued_at,
    deactivatedAt: row.deactivated_at,
    replacesTagId: row.replaces_tag_id,
  };
}

async function listActiveBikesForOwner(ownerUserId: string): Promise<Bike[]> {
  const bikes = await bikesRepo.listForOwner(ownerUserId);
  return bikes.filter((bike) => bike.status === 'active');
}

export async function buildAlarmView(alarm: Alarm): Promise<AlarmView> {
  const event = await eventsRepo.findById(alarm.eventId);
  if (!event) throw ApiError.notFound('The crossing behind this alarm no longer exists.');

  const [gate, presentedUser, tag] = await Promise.all([
    gatesRepo.findById(event.gateId),
    event.userId ? usersRepo.findById(event.userId) : Promise.resolve(null),
    event.tagRef ? findTagByRef(event.tagRef) : Promise.resolve(null),
  ]);
  const tagBike = tag ? await bikesRepo.findById(tag.bikeId) : null;
  const registeredOwner = tagBike ? await usersRepo.findById(tagBike.ownerUserId) : null;
  const ownerBikes = presentedUser ? await listActiveBikesForOwner(presentedUser.userId) : [];
  const resolvedByName = alarm.resolvedByUserId
    ? (await usersRepo.findById(alarm.resolvedByUserId))?.name ?? null
    : null;

  return {
    alarm,
    event,
    gateName: gate?.name ?? 'Unknown gate',
    presentedUser,
    registeredOwner,
    tagBike,
    ownerBikes,
    resolvedByName,
  };
}

export async function toAlarmViewByAlarmId(alarmId: string): Promise<AlarmView> {
  const alarm = await alarmsRepo.findById(alarmId);
  if (!alarm) throw ApiError.notFound('That alarm has already been closed.');
  return buildAlarmView(alarm);
}

export async function requireUser(userId: string): Promise<User> {
  const user = await usersRepo.findById(userId);
  if (!user) throw ApiError.notFound('That user no longer exists.');
  return user;
}
