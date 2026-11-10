ALTER TABLE minutes ADD COLUMN meeting_id uuid REFERENCES meetings;
CREATE UNIQUE INDEX minutes_meeting ON minutes(meeting_id) WHERE meeting_id IS NOT NULL;
CREATE TABLE minute_revisions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,minute_id uuid NOT NULL REFERENCES minutes,version integer NOT NULL,content text NOT NULL,actor_id uuid NOT NULL REFERENCES users,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(minute_id,version));
CREATE TABLE agreements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),minute_id uuid NOT NULL REFERENCES minutes,title text NOT NULL,owner_id uuid NOT NULL REFERENCES users,due_on date NOT NULL,status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED')),version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX agreements_minute ON agreements(minute_id);
