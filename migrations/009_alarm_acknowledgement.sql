ALTER TABLE alarms
  ADD COLUMN acknowledge_by          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  ADD COLUMN acknowledged_at         TIMESTAMPTZ,
  ADD COLUMN acknowledged_by_user_id UUID REFERENCES users (user_id) ON DELETE SET NULL,
  ADD COLUMN escalation_reason       TEXT CHECK (escalation_reason IN ('no_acknowledgement', 'guard_request'));

UPDATE alarms SET status = 'pending' WHERE status = 'open';
UPDATE alarms SET acknowledge_by = raised_at + interval '2 minutes';
UPDATE alarms SET escalation_reason = 'guard_request' WHERE status = 'escalated' AND escalation_reason IS NULL;

ALTER TABLE alarms ALTER COLUMN status SET DEFAULT 'pending';
CREATE INDEX alarms_pending_deadline_idx ON alarms (acknowledge_by) WHERE status = 'pending';