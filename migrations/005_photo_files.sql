CREATE TABLE photo_files (
  file_path TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);