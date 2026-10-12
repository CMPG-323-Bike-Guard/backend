BEGIN;

CREATE TYPE photo_status AS ENUM ('none', 'pending', 'approved', 'rejected');

ALTER TABLE users
  ADD COLUMN phone                  TEXT,
  ADD COLUMN photo_pending          TEXT,
  ADD COLUMN photo_status           photo_status NOT NULL DEFAULT 'none',
  ADD COLUMN photo_rejection_reason TEXT,
  ADD COLUMN photo_reviewed_by      UUID REFERENCES users (user_id) ON DELETE SET NULL,
  ADD COLUMN photo_reviewed_at      TIMESTAMPTZ,
  ADD COLUMN photo_submitted_at     TIMESTAMPTZ;

ALTER TABLE bikes
  ADD COLUMN photo_pending          TEXT,
  ADD COLUMN photo_status           photo_status NOT NULL DEFAULT 'none',
  ADD COLUMN photo_rejection_reason TEXT,
  ADD COLUMN photo_reviewed_by      UUID REFERENCES users (user_id) ON DELETE SET NULL,
  ADD COLUMN photo_reviewed_at      TIMESTAMPTZ,
  ADD COLUMN photo_submitted_at     TIMESTAMPTZ;

UPDATE users SET photo_status = 'approved' WHERE photo_path IS NOT NULL;
UPDATE bikes SET photo_status = 'approved' WHERE photo_path IS NOT NULL;

CREATE INDEX users_photo_pending_idx ON users (photo_submitted_at) WHERE photo_status = 'pending';
CREATE INDEX bikes_photo_pending_idx ON bikes (photo_submitted_at) WHERE photo_status = 'pending';

COMMIT;