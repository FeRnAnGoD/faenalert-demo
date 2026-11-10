-- Existing records remain valid. Unknown historical attribution is deliberately NULL.
CREATE TABLE people(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),display_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE users ADD COLUMN person_id uuid REFERENCES people;
ALTER TABLE members ADD COLUMN person_id uuid REFERENCES people;
INSERT INTO people(id,display_name) SELECT id,name FROM users;
UPDATE users SET person_id=id;
INSERT INTO people(id,display_name) SELECT id,name FROM members ON CONFLICT DO NOTHING;
UPDATE members SET person_id=id;
CREATE UNIQUE INDEX users_person ON users(person_id) WHERE person_id IS NOT NULL;
ALTER TABLE committees ADD CONSTRAINT committees_id_site_unique UNIQUE(id,site_id);
ALTER TABLE meetings ADD COLUMN committee_id uuid;
ALTER TABLE meetings ADD CONSTRAINT meetings_committee_site_fk FOREIGN KEY(committee_id,site_id) REFERENCES committees(id,site_id);
ALTER TABLE meetings ADD CONSTRAINT meetings_id_site_unique UNIQUE(id,site_id);
ALTER TABLE minutes ADD CONSTRAINT minutes_meeting_site_fk FOREIGN KEY(meeting_id,site_id) REFERENCES meetings(id,site_id);
ALTER TABLE sites ADD COLUMN timezone text NOT NULL DEFAULT 'America/Santiago';
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['meetings','minutes','agreements','inspections','actions','findings','committees','members','trainings','commissions','incidents','documents'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN created_by uuid REFERENCES users, ADD COLUMN updated_by uuid REFERENCES users',t);
 END LOOP;
END $$;
ALTER TABLE actions ADD COLUMN closed_at timestamptz;
ALTER TABLE agreements ADD COLUMN closed_at timestamptz;
-- Historical closures have no invented timestamp.
CREATE FUNCTION track_record_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.updated_at=now();
 IF TG_TABLE_NAME IN ('actions','agreements') THEN
  IF NEW.status IN ('CLOSED','COMPLETED') AND OLD.status NOT IN ('CLOSED','COMPLETED') THEN NEW.closed_at=now(); END IF;
 END IF;
 RETURN NEW;
END $$;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['meetings','minutes','agreements','inspections','actions','findings','committees','members','trainings','commissions','incidents','documents'] LOOP
  EXECUTE format('CREATE TRIGGER record_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION track_record_update()',t);
 END LOOP;
END $$;
ALTER TABLE minute_revisions ADD COLUMN title text,ADD COLUMN status text,ADD COLUMN meeting_id uuid REFERENCES meetings;
CREATE FUNCTION protect_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Document revisions are append-only'; END $$;
CREATE TRIGGER revisions_append_only BEFORE UPDATE OR DELETE ON minute_revisions FOR EACH ROW EXECUTE FUNCTION protect_revision();
CREATE INDEX inspections_site_created ON inspections(site_id,created_at DESC,id);
CREATE INDEX audit_site_entity_id ON audit_events(site_id,entity_id,id DESC);
CREATE INDEX agreements_owner_due ON agreements(owner_id,due_on);
CREATE INDEX meetings_committee ON meetings(committee_id);
CREATE VIEW commitments AS
 SELECT a.id,'INSPECTION'::text AS source,i.id AS source_id,a.title,a.owner_id,i.site_id,a.due_on,a.status,(a.status='CLOSED') AS closed,a.closed_at FROM actions a JOIN findings f ON f.id=a.finding_id JOIN inspections i ON i.id=f.inspection_id
 UNION ALL
 SELECT a.id,'MEETING'::text,m.meeting_id,a.title,a.owner_id,m.site_id,a.due_on,a.status,(a.status='COMPLETED'),a.closed_at FROM agreements a JOIN minutes m ON m.id=a.minute_id WHERE m.meeting_id IS NOT NULL;
