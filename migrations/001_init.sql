

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role          AS ENUM ('student', 'staff', 'guard', 'admin');

CREATE TYPE account_status     AS ENUM ('active', 'suspended');

CREATE TYPE bike_status        AS ENUM (
    'draft',
    'pending_approval',
    'rejected',
    'tag_pending',
    'active',
    'removed'
);
CREATE TYPE tag_status         AS ENUM ('active', 'deactivated', 'lost', 'stolen', 'awaiting_collection');

CREATE TYPE card_status        AS ENUM ('active', 'blocked');
CREATE TYPE permission_status  AS ENUM ('active', 'revoked');
CREATE TYPE lost_report_status AS ENUM ('open', 'resolved', 'cancelled');

CREATE TYPE gate_health        AS ENUM ('good', 'warning', 'error', 'not_commissioned');
CREATE TYPE gate_mode          AS ENUM ('automated', 'manual');
CREATE TYPE crossing_result    AS ENUM ('match', 'mismatch', 'manual');

CREATE TYPE mismatch_reason    AS ENUM (
    'tag_not_registered',
    'tag_registered_to_other_user',
    'tag_deactivated',
    'tag_reported_lost',
    'tag_reported_stolen',
    'incomplete_read'
);
CREATE TYPE crossing_source    AS ENUM ('automated', 'manual_entry', 'guard_override');
CREATE TYPE alarm_status       AS ENUM ('open', 'escalated', 'cleared_in_person', 'reported_stolen');
CREATE TYPE notification_kind  AS ENUM ('tag_ready', 'registration', 'security', 'system');

CREATE TABLE users (
    user_id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number  TEXT           NOT NULL UNIQUE,
    name            TEXT           NOT NULL,
    email           TEXT           NOT NULL UNIQUE,
    role            user_role      NOT NULL,
    account_status  account_status NOT NULL DEFAULT 'active',
    password_hash   TEXT           NOT NULL,
    photo_path      TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE cards (
    card_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    card_hmac  TEXT        NOT NULL UNIQUE,
    card_ref   TEXT        NOT NULL,
    status     card_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bikes (
    bike_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID        NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    name          TEXT        NOT NULL,
    make_model    TEXT        NOT NULL DEFAULT '',
    colour        TEXT        NOT NULL DEFAULT '',
    photo_path    TEXT,
    status        bike_status NOT NULL DEFAULT 'draft',
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at   TIMESTAMPTZ,
    review_note   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rfid_tags (
    tag_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bike_id         UUID        NOT NULL REFERENCES bikes (bike_id) ON DELETE RESTRICT,
    tag_hmac        TEXT        NOT NULL UNIQUE,
    tag_ref         TEXT        NOT NULL,
    status          tag_status  NOT NULL DEFAULT 'awaiting_collection',
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at  TIMESTAMPTZ,
    replaces_tag_id UUID REFERENCES rfid_tags (tag_id),
    CONSTRAINT rfid_tags_dates_ok CHECK (deactivated_at IS NULL OR deactivated_at >= issued_at)
);

CREATE UNIQUE INDEX rfid_tags_one_live_per_bike
    ON rfid_tags (bike_id) WHERE status IN ('active', 'awaiting_collection');

CREATE TABLE lost_tag_reports (
    report_id      UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id         UUID               NOT NULL REFERENCES rfid_tags (tag_id) ON DELETE RESTRICT,
    reported_by    UUID               NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    stolen         BOOLEAN            NOT NULL DEFAULT FALSE,
    reported_at    TIMESTAMPTZ        NOT NULL DEFAULT now(),
    status         lost_report_status NOT NULL DEFAULT 'open',
    notes          TEXT
);

CREATE TABLE bike_permissions (
    permission_id      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    bike_id            UUID              NOT NULL REFERENCES bikes (bike_id) ON DELETE RESTRICT,
    authorised_user_id UUID              NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    granted_by         UUID              NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    status             permission_status NOT NULL DEFAULT 'active',
    granted_at         TIMESTAMPTZ       NOT NULL DEFAULT now(),
    revoked_at         TIMESTAMPTZ,
    CONSTRAINT bike_permissions_dates_ok CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE UNIQUE INDEX bike_permissions_one_active_per_pair
    ON bike_permissions (bike_id, authorised_user_id) WHERE status = 'active';

CREATE TABLE gates (
    gate_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL UNIQUE,
    location      TEXT        NOT NULL DEFAULT '',
    health        gate_health NOT NULL DEFAULT 'not_commissioned',
    commissioned  BOOLEAN     NOT NULL DEFAULT FALSE,
    mode          gate_mode   NOT NULL DEFAULT 'automated',
    manual_since  TIMESTAMPTZ
);

CREATE TABLE gate_events (
    event_id        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    "timestamp"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
    gate_id         UUID              NOT NULL REFERENCES gates (gate_id) ON DELETE RESTRICT,
    user_id         UUID              REFERENCES users (user_id) ON DELETE SET NULL,
    bike_id         UUID              REFERENCES bikes (bike_id) ON DELETE SET NULL,
    card_ref        TEXT,
    tag_ref         TEXT,
    result          crossing_result   NOT NULL,
    mismatch_reason mismatch_reason,
    source          crossing_source   NOT NULL DEFAULT 'automated',
    guard_user_id   UUID              REFERENCES users (user_id) ON DELETE SET NULL,
    verification_ms INTEGER,
    offline         BOOLEAN           NOT NULL DEFAULT FALSE,
    note            TEXT
);

CREATE TABLE alarms (
    alarm_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID          NOT NULL UNIQUE REFERENCES gate_events (event_id) ON DELETE RESTRICT,
    status             alarm_status  NOT NULL DEFAULT 'open',
    raised_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    escalated_at       TIMESTAMPTZ,
    resolved_by_user_id UUID         REFERENCES users (user_id) ON DELETE SET NULL,
    resolved_at        TIMESTAMPTZ,
    notes              TEXT
);

CREATE TABLE notifications (
    notification_id UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID              NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    title           TEXT              NOT NULL,
    body            TEXT              NOT NULL,
    kind            notification_kind NOT NULL DEFAULT 'system',
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    read            BOOLEAN           NOT NULL DEFAULT FALSE
);

CREATE TABLE audit_log (
    audit_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID        REFERENCES users (user_id) ON DELETE SET NULL,
    action        TEXT        NOT NULL,
    entity_type   TEXT        NOT NULL,
    entity_id     TEXT        NOT NULL,
    "timestamp"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    detail        TEXT        NOT NULL DEFAULT ''
);

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX bikes_owner_idx                ON bikes (owner_user_id);
CREATE INDEX bikes_status_idx               ON bikes (status);
CREATE INDEX rfid_tags_bike_id_idx          ON rfid_tags (bike_id);
CREATE INDEX cards_user_id_idx              ON cards (user_id);
CREATE INDEX bike_permissions_bike_id_idx   ON bike_permissions (bike_id);
CREATE INDEX bike_permissions_user_idx      ON bike_permissions (authorised_user_id);
CREATE INDEX lost_tag_reports_tag_id_idx    ON lost_tag_reports (tag_id);
CREATE INDEX gate_events_gate_time_idx      ON gate_events (gate_id, "timestamp" DESC);
CREATE INDEX gate_events_timestamp_idx      ON gate_events ("timestamp" DESC);
CREATE INDEX gate_events_user_id_idx        ON gate_events (user_id);
CREATE INDEX gate_events_bike_id_idx        ON gate_events (bike_id);
CREATE INDEX gate_events_result_idx         ON gate_events (result);
CREATE INDEX alarms_event_id_idx            ON alarms (event_id);
CREATE INDEX alarms_status_idx              ON alarms (status);
CREATE INDEX notifications_user_id_idx      ON notifications (user_id);
CREATE INDEX audit_log_timestamp_idx        ON audit_log ("timestamp" DESC);

COMMIT;
