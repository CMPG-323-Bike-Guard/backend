
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
export type AlarmStatus = 'pending' | 'acknowledged' | 'escalated' | 'cleared_in_person' | 'reported_stolen';
export type AlarmResolution = Extract<AlarmStatus, 'cleared_in_person' | 'reported_stolen'>;
export type EscalationReason = 'no_acknowledgement' | 'guard_request';
export const LIVE_ALARM_STATUSES: readonly AlarmStatus[] = ['pending', 'acknowledged', 'escalated'];
export const isLiveAlarm = (status: AlarmStatus): boolean => LIVE_ALARM_STATUSES.includes(status);
export type CrossingSource = 'automated' | 'manual_entry' | 'guard_override';
export type NotificationKind = 'tag_ready' | 'registration' | 'security' | 'photo_review' | 'system';
export type PhotoStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type PhotoTargetType = 'user' | 'bike';

export interface PhotoModeration {
  live: string | null;
  pending: string | null;
  status: PhotoStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
}

export interface PendingPhoto {
  targetType: PhotoTargetType;
  entityId: string;
  ownerUserId: string;
  ownerName: string;
  photo: PhotoModeration;
}

export interface PhotoReviewResult {
  targetType: PhotoTargetType;
  entityId: string;
  photo: PhotoModeration;
}

export interface User {
  userId: string;
  studentStaffNumber: string;
  name: string;
  role: Role;
  email: string;
  phone: string | null;
  photo: PhotoModeration;
  photoPath: string | null;
  accountStatus: AccountStatus;
}

export interface Bike {
  bikeId: string;
  ownerUserId: string;
  name: string;
  makeModel: string;
  colour: string;
  photo: PhotoModeration;
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
  studentNumber: string | null;
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
  acknowledgeBy: string;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  escalatedAt: string | null;
  escalationReason: EscalationReason | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  notes: string | null;
}

export interface BikePermission {
  permissionId: string;
  bikeId: string;
  authorisedUserId: string | null;
  authorisedStudentNumber: string;
  authorisedName: string | null;
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
  acknowledgedByName: string | null;
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
  | { type: 'alarm-escalated'; alarm: AlarmView }
  | { type: 'gate'; gate: Gate };
