BEGIN;

CREATE TYPE card_status AS ENUM ('active', 'blocked');

CREATE TABLE cards (
    card_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number TEXT        NOT NULL,
    card_hmac      TEXT        NOT NULL UNIQUE,
    card_ref       TEXT        NOT NULL,
    status         card_status NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cards_student_number_idx ON cards (student_number);

COMMIT;