import type { PhotoModeration, PhotoStatus } from './types';

export interface PhotoColumns {
  photo_path: string | null;
  photo_pending: string | null;
  photo_status: PhotoStatus;
  photo_rejection_reason: string | null;
  photo_reviewed_by: string | null;
  photo_reviewed_at: string | null;
  photo_submitted_at: string | null;
}

function iso(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function toPhoto(row: PhotoColumns): PhotoModeration {
  return {
    live: row.photo_path,
    pending: row.photo_pending,
    status: row.photo_status,
    rejectionReason: row.photo_rejection_reason,
    reviewedBy: row.photo_reviewed_by,
    reviewedAt: iso(row.photo_reviewed_at),
    submittedAt: iso(row.photo_submitted_at),
  };
}

export function withoutPending<T extends { photo: PhotoModeration }>(entity: T): T;
export function withoutPending<T extends { photo: PhotoModeration }>(entity: T | null): T | null;
export function withoutPending<T extends { photo: PhotoModeration }>(entity: T | null): T | null {
  if (!entity) return entity;
  return { ...entity, photo: { ...entity.photo, pending: null, rejectionReason: null } };
}