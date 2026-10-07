BEGIN;

ALTER TABLE gate_events RENAME COLUMN card_ref TO student_number;

UPDATE gate_events SET student_number = NULL;

UPDATE gate_events AS e
   SET student_number = u.student_number
  FROM users AS u
 WHERE e.user_id = u.user_id;

DROP TABLE cards;
DROP TYPE card_status;

COMMIT;