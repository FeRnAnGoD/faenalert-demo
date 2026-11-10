CREATE TABLE meeting_attendance (
  meeting_id uuid NOT NULL REFERENCES meetings ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members,
  present boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL REFERENCES users,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(meeting_id,member_id)
);
