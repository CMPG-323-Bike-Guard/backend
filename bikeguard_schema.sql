BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; 


CREATE TYPE user_role          AS ENUM ('student', 'staff', 'guard', 'admin');
CREATE TYPE account_status     AS ENUM ('active', 'suspended', 'deactivated');
CREATE TYPE bike_status        AS ENUM ('active', 'inactive', 'stolen');
CREATE TYPE tag_status         AS ENUM ('active', 'lost', 'deactivated');
CREATE TYPE card_status        AS ENUM ('active', 'lost', 'deactivated');
CREATE TYPE permission_status  AS ENUM ('active', 'revoked');
CREATE TYPE lost_report_status AS ENUM ('open', 'resolved', 'cancelled');
CREATE TYPE gate_status        AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE gate_event_result  AS ENUM (
    'allowed',        -- tag and card belong together (or a valid guest permission exists)
    'mismatch',       -- tag and card do not belong together
    'unknown_tag',    -- tag not found in rfid_tags
    'unknown_card',   -- card not found in cards
    'inactive_tag',   -- tag is lost or deactivated
    'inactive_card'   -- card is lost or deactivated
);
CREATE TYPE alarm_resolution   AS ENUM ('unresolved', 'cleared', 'escalated');

-- ---------------------------------------------------------------------
-- users  
-- Students, Staff, guards and admins use this table
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number  TEXT           NOT NULL UNIQUE,
    name            TEXT           NOT NULL,
    role            user_role      NOT NULL,
    account_status  account_status NOT NULL DEFAULT 'active',
    password_hash   TEXT           NOT NULL,          -- store a bcrypt/argon2 hash, never the password
    photo_path      TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- bikes 
-- ---------------------------------------------------------------------
CREATE TABLE bikes (
    bike_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    bike_name   TEXT        NOT NULL,
    make        TEXT,
    model       TEXT,
    colour      TEXT,
    photo_path  TEXT,
    status      bike_status NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- rfid_tags  (a bike can have many tags over time, but only one active)
-- ---------------------------------------------------------------------
CREATE TABLE rfid_tags (
    tag_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bike_id         UUID        NOT NULL REFERENCES bikes (bike_id) ON DELETE RESTRICT,
    tag_hmac        TEXT        NOT NULL UNIQUE,
    status          tag_status  NOT NULL DEFAULT 'active',
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at  TIMESTAMPTZ,
    CONSTRAINT rfid_tags_dates_ok CHECK (deactivated_at IS NULL OR deactivated_at >= issued_at)
);

-- ---------------------------------------------------------------------
-- cards  (NWU student/staff cards)
-- ---------------------------------------------------------------------
CREATE TABLE cards (
    card_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    card_hmac  TEXT        NOT NULL UNIQUE,
    status     card_status NOT NULL DEFAULT 'active'
);

-- ---------------------------------------------------------------------
-- bike_permissions
-- authorizer_id lets guest_id use the bike.
-- ---------------------------------------------------------------------
CREATE TABLE bike_permissions (
    permission_id  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    bike_id        UUID              NOT NULL REFERENCES bikes (bike_id) ON DELETE RESTRICT,
    authorizer_id  UUID              NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    guest_id       UUID              NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    status         permission_status NOT NULL DEFAULT 'active',
    granted_at     TIMESTAMPTZ       NOT NULL DEFAULT now(),
    revoked_at     TIMESTAMPTZ,
    CONSTRAINT bike_permissions_not_self CHECK (authorizer_id <> guest_id),
    CONSTRAINT bike_permissions_dates_ok CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

-- ---------------------------------------------------------------------
-- lost_tag_reports  (user_id = the person who reported the tag lost)
-- ---------------------------------------------------------------------
CREATE TABLE lost_tag_reports (
    report_id      UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id         UUID               NOT NULL REFERENCES rfid_tags (tag_id) ON DELETE RESTRICT,
    user_id        UUID               NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    reported_time  TIMESTAMPTZ        NOT NULL DEFAULT now(),
    status         lost_report_status NOT NULL DEFAULT 'open',
    notes          TEXT
);

-- ---------------------------------------------------------------------
-- gates
-- ---------------------------------------------------------------------
CREATE TABLE gates (
    gate_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_name     TEXT        NOT NULL UNIQUE,
    gate_address  TEXT        NOT NULL,
    status        gate_status NOT NULL DEFAULT 'active'
);

-- ---------------------------------------------------------------------
-- gate_events  
-- ---------------------------------------------------------------------
CREATE TABLE gate_events (
    event_id       UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    gate_id        UUID              NOT NULL REFERENCES gates (gate_id)                  ON DELETE RESTRICT,
    card_id        UUID                       REFERENCES cards (card_id)                  ON DELETE RESTRICT,
    tag_id         UUID                       REFERENCES rfid_tags (tag_id)               ON DELETE RESTRICT,
    bike_id        UUID                       REFERENCES bikes (bike_id)                  ON DELETE RESTRICT,
    permission_id  UUID                       REFERENCES bike_permissions (permission_id) ON DELETE RESTRICT,
    result         gate_event_result NOT NULL
);

-- ---------------------------------------------------------------------
-- alarms  (raised from a gate event, handled by a guard)
-- guard_id is empty until a guard picks the alarm up.
-- ---------------------------------------------------------------------
CREATE TABLE alarms (
    alarm_id    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID             NOT NULL REFERENCES gate_events (event_id) ON DELETE RESTRICT,
    guard_id    UUID                      REFERENCES users (user_id)        ON DELETE RESTRICT,
    resolution  alarm_resolution NOT NULL DEFAULT 'unresolved',
    notes       TEXT
);

-- ---------------------------------------------------------------------
-- Business-rules
-- ---------------------------------------------------------------------
-- A bike can only have one active tag at a time.
CREATE UNIQUE INDEX rfid_tags_one_active_per_bike
    ON rfid_tags (bike_id) WHERE status = 'active';

-- The same guest cannot hold two active permissions on the same bike.
CREATE UNIQUE INDEX bike_permissions_one_active_per_guest
    ON bike_permissions (bike_id, guest_id) WHERE status = 'active';

-- ---------------------------------------------------------------------
-- Foreign key / lookup indexes (PostgreSQL does not create these itself)
-- ---------------------------------------------------------------------
CREATE INDEX bikes_user_id_idx              ON bikes (user_id);
CREATE INDEX rfid_tags_bike_id_idx          ON rfid_tags (bike_id);
CREATE INDEX cards_user_id_idx              ON cards (user_id);
CREATE INDEX bike_permissions_bike_id_idx   ON bike_permissions (bike_id);
CREATE INDEX bike_permissions_authorizer_idx ON bike_permissions (authorizer_id);
CREATE INDEX bike_permissions_guest_id_idx  ON bike_permissions (guest_id);
CREATE INDEX lost_tag_reports_tag_id_idx    ON lost_tag_reports (tag_id);
CREATE INDEX lost_tag_reports_user_id_idx   ON lost_tag_reports (user_id);
CREATE INDEX gate_events_gate_time_idx      ON gate_events (gate_id, timestamp DESC);
CREATE INDEX gate_events_timestamp_idx      ON gate_events (timestamp DESC);
CREATE INDEX gate_events_card_id_idx        ON gate_events (card_id);
CREATE INDEX gate_events_tag_id_idx         ON gate_events (tag_id);
CREATE INDEX gate_events_bike_id_idx        ON gate_events (bike_id);
CREATE INDEX gate_events_permission_id_idx  ON gate_events (permission_id);
CREATE INDEX alarms_event_id_idx            ON alarms (event_id);
CREATE INDEX alarms_guard_id_idx            ON alarms (guard_id);
-- Fast "open alarms" list for the Guard Dashboard.
CREATE INDEX alarms_unresolved_idx          ON alarms (alarm_id) WHERE resolution = 'unresolved';

-- ---------------------------------------------------------------------
-- Keep users.updated_at current automatically
-- ---------------------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;