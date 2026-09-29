
export type Role = 'student' | 'staff' | 'guard' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export type BikeStatus = 'draft' | 'pending_approval' | 'rejected' | 'tag_pending' | 'active' | 'removed';
export type TagStatus = 'active' | 'deactivated' | 'lost' | 'stolen' | 'awaiting_collection';
export type GateHealth = 'good' | 'warning' | 'error' | 'not_commissioned';
export type GateMode = 'automated' | 'manual';
export type CrossingResult = 'match' | 'mismatch' | 'manual';
export type MismatchReason =
  | 'tag_not_registered'
  | 'tag_registered_to_other_user'
  | 'tag_deactivated'
  | 'tag_reported_lost'
  | 'tag_reported_stolen'
  | 'incomplete_read';
export type AlarmStatus = 'open' | 'escalated' | 'cleared_in_person' | 'reported_stolen';
export type CrossingSource = 'automated' | 'manual_entry' | 'guard_override';
export type NotificationKind = 'tag_ready' | 'registration' | 'security' | 'system';

export interface User {
  userId: string;
  studentStaffNumber: string;
  name: string;
  role: Role;
  email: string;
  photoPath: string | null;
  accountStatus: AccountStatus;
}

export interface Card {
  cardId: string;
  userId: string;
  cardRef: string;
  status: 'active' | 'blocked';
}

export interface Bike {
  bikeId: string;
  ownerUserId: string;
  name: string;
  makeModel: string;
  colour: string;
  photoPath: string | null;
  status: BikeStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface RfidTag {
  tagId: string;
  bikeId: string;
  tagRef: string;
  status: TagStatus;
  issuedAt: string | null;
  deactivatedAt: string | null;
  replacesTagId: string | null;
}

export interface Gate {
  gateId: string;
  name: string;
  location: string;
  health: GateHealth;
  commissioned: boolean;
  mode: GateMode;
  manualSince: string | null;
}

export interface GateEvent {
  eventId: string;
  timestamp: string;
  gateId: string;
  userId: string | null;
  bikeId: string | null;
  cardRef: string | null;
  tagRef: string | null;
  result: CrossingResult;
  mismatchReason: MismatchReason | null;
  source: CrossingSource;
  guardUserId: string | null;
  verificationMs: number | null;
  offline: boolean;
  note: string | null;
}

export interface Alarm {
  alarmId: string;
  eventId: string;
  status: AlarmStatus;
  raisedAt: string;
  escalatedAt: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  notes: string | null;
}

export interface BikePermission {
  permissionId: string;
  bikeId: string;
  authorisedUserId: string;
  status: 'active' | 'revoked';
  grantedAt: string;
  revokedAt: string | null;
}

export interface AuditAction {
  auditId: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  detail: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: NotificationKind;
}

export interface Session {
  token: string;
  user: User;
}

export interface AlarmView {
  alarm: Alarm;
  event: GateEvent;
  gateName: string;
  presentedUser: User | null;
  registeredOwner: User | null;
  tagBike: Bike | null;
  ownerBikes: Bike[];
  resolvedByName: string | null;
}

export interface CrossingView {
  event: GateEvent;
  gateName: string;
  userName: string | null;
  studentStaffNumber: string | null;
  bikeName: string | null;
  alarmStatus: AlarmStatus | null;
}

export interface PermissionView extends BikePermission {
  authorisedUserName: string;
  authorisedStudentNumber: string;
}

export interface BikeView {
  bike: Bike;
  tag: RfidTag | null;
  owner: User;
  permissions: PermissionView[];
}

export interface DashboardStats {
  crossingsToday: number;
  matchesToday: number;
  mismatchesToday: number;
  openAlarms: number;
  manualGates: number;
  registeredBikes: number;
  pendingRegistrations: number;
  medianVerificationMs: number;
  p95VerificationMs: number;
  readSuccessRate: number;
}

export interface SeriesPoint {
  label: string;
  matches: number;
  mismatches: number;
  manual: number;
}

export interface RepeatMismatchRow {
  userId: string | null;
  name: string;
  studentStaffNumber: string;
  count: number;
  lastSeen: string;
  reasons: MismatchReason[];
}

export interface ReportBundle {
  stats: DashboardStats;
  throughputByDay: SeriesPoint[];
  throughputByHour: SeriesPoint[];
  repeatMismatches: RepeatMismatchRow[];
  registrationUptake: Array<{ label: string; registered: number }>;
}

export type RealtimeEvent =
  | { type: 'crossing'; crossing: CrossingView }
  | { type: 'alarm'; alarm: AlarmView }
  | { type: 'alarm-updated'; alarm: AlarmView }
  | { type: 'gate'; gate: Gate };
