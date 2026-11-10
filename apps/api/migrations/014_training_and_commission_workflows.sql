ALTER TABLE trainings
  ADD CONSTRAINT trainings_id_site_unique UNIQUE (id, site_id);

CREATE TABLE training_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites,
  participant_name text NOT NULL CHECK (length(trim(participant_name)) BETWEEN 1 AND 200),
  attended boolean,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users,
  updated_by uuid REFERENCES users,
  FOREIGN KEY (training_id, site_id) REFERENCES trainings(id, site_id)
);

CREATE INDEX training_participants_roster
  ON training_participants(training_id, created_at, id);

CREATE TRIGGER training_participants_updated
  BEFORE UPDATE ON training_participants
  FOR EACH ROW EXECUTE FUNCTION track_record_update();

CREATE TABLE training_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites,
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 10000),
  recorded_by uuid NOT NULL REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (training_id, site_id) REFERENCES trainings(id, site_id)
);

CREATE INDEX training_evidence_history
  ON training_evidence(training_id, created_at DESC, id);

CREATE FUNCTION prevent_training_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'training_evidence is append-only';
END $$;

CREATE TRIGGER training_evidence_append_only
  BEFORE UPDATE OR DELETE ON training_evidence
  FOR EACH ROW EXECUTE FUNCTION prevent_training_evidence_mutation();

ALTER TABLE findings ADD COLUMN site_id uuid;
UPDATE findings f
SET site_id = i.site_id
FROM inspections i
WHERE i.id = f.inspection_id;
ALTER TABLE findings ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE findings ADD CONSTRAINT findings_id_site_unique UNIQUE (id, site_id);
ALTER TABLE findings ADD CONSTRAINT findings_site_fk FOREIGN KEY (site_id) REFERENCES sites;

ALTER TABLE commissions
  ADD CONSTRAINT commissions_id_site_unique UNIQUE (id, site_id);

ALTER TABLE actions
  ALTER COLUMN finding_id DROP NOT NULL,
  ADD COLUMN commission_id uuid,
  ADD COLUMN site_id uuid;

UPDATE actions a
SET site_id = i.site_id
FROM findings f
JOIN inspections i ON i.id = f.inspection_id
WHERE f.id = a.finding_id;

ALTER TABLE actions ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE actions ADD CONSTRAINT actions_site_fk FOREIGN KEY (site_id) REFERENCES sites;
ALTER TABLE actions ADD CONSTRAINT actions_finding_site_fk FOREIGN KEY (finding_id, site_id) REFERENCES findings(id, site_id);
ALTER TABLE actions ADD CONSTRAINT actions_commission_site_fk FOREIGN KEY (commission_id, site_id) REFERENCES commissions(id, site_id);
ALTER TABLE actions ADD CONSTRAINT actions_one_source CHECK (num_nonnulls(finding_id, commission_id) = 1);
CREATE INDEX actions_commission_due ON actions(commission_id, due_on) WHERE commission_id IS NOT NULL;

CREATE FUNCTION set_action_site() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_site uuid;
BEGIN
  IF NEW.finding_id IS NOT NULL THEN
    SELECT site_id INTO linked_site FROM findings WHERE id = NEW.finding_id;
  ELSIF NEW.commission_id IS NOT NULL THEN
    SELECT site_id INTO linked_site FROM commissions WHERE id = NEW.commission_id;
  END IF;
  IF linked_site IS NULL THEN
    RAISE EXCEPTION 'Action source does not exist';
  END IF;
  IF NEW.site_id IS NOT NULL AND NEW.site_id <> linked_site THEN
    RAISE EXCEPTION 'Action source belongs to another site';
  END IF;
  NEW.site_id := linked_site;
  RETURN NEW;
END $$;

CREATE TRIGGER actions_set_site
  BEFORE INSERT OR UPDATE OF finding_id, commission_id, site_id ON actions
  FOR EACH ROW EXECUTE FUNCTION set_action_site();

DROP VIEW commitments;
CREATE VIEW commitments AS
  SELECT a.id,
    CASE WHEN a.commission_id IS NOT NULL THEN 'COMMISSION'::text ELSE 'INSPECTION'::text END AS source,
    COALESCE(a.commission_id, i.id) AS source_id,
    a.title, a.owner_id, a.site_id, a.due_on, a.status,
    (a.status = 'CLOSED') AS closed, a.closed_at
  FROM actions a
  LEFT JOIN inspections i ON i.id = (
    SELECT f.inspection_id FROM findings f WHERE f.id = a.finding_id
  )
  WHERE a.finding_id IS NOT NULL OR a.commission_id IS NOT NULL
  UNION ALL
  SELECT a.id, 'MEETING'::text AS source, m.meeting_id AS source_id,
    a.title, a.owner_id, m.site_id, a.due_on, a.status,
    (a.status = 'COMPLETED') AS closed, a.closed_at
  FROM agreements a
  JOIN minutes m ON m.id = a.minute_id
  WHERE m.meeting_id IS NOT NULL;

CREATE OR REPLACE FUNCTION fill_finding_site() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_site uuid;
BEGIN
  SELECT site_id INTO linked_site FROM inspections WHERE id = NEW.inspection_id;
  IF linked_site IS NULL THEN
    RAISE EXCEPTION 'Inspection does not exist';
  END IF;
  IF NEW.site_id IS NOT NULL AND NEW.site_id <> linked_site THEN
    RAISE EXCEPTION 'Finding inspection belongs to another site';
  END IF;
  NEW.site_id := linked_site;
  RETURN NEW;
END $$;

CREATE TRIGGER findings_set_site
  BEFORE INSERT OR UPDATE OF inspection_id, site_id ON findings
  FOR EACH ROW EXECUTE FUNCTION fill_finding_site();
