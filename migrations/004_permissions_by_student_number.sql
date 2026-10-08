-- A guest is identified by the student number on their own card, so they do not need a BikeGuard account.
ALTER TABLE bike_permissions ADD COLUMN authorised_student_number TEXT;
ALTER TABLE bike_permissions ADD COLUMN authorised_name TEXT;

UPDATE bike_permissions p
   SET authorised_student_number = u.student_number
  FROM users u
 WHERE u.user_id = p.authorised_user_id;

ALTER TABLE bike_permissions ALTER COLUMN authorised_student_number SET NOT NULL;
ALTER TABLE bike_permissions ALTER COLUMN authorised_user_id DROP NOT NULL;

DROP INDEX bike_permissions_one_active_per_pair;
CREATE UNIQUE INDEX bike_permissions_one_active_per_number
    ON bike_permissions (bike_id, authorised_student_number) WHERE status = 'active';
CREATE INDEX bike_permissions_number_idx ON bike_permissions (authorised_student_number);