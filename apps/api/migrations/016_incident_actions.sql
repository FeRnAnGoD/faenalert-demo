ALTER TABLE actions
  DROP CONSTRAINT actions_one_source,
  ADD COLUMN incident_id uuid;

ALTER TABLE actions
  ADD CONSTRAINT actions_incident_site_fk
    FOREIGN KEY (incident_id, site_id) REFERENCES incidents(id, site_id),
  ADD CONSTRAINT actions_one_source
    CHECK (num_nonnulls(finding_id, commission_id, incident_id) = 1);

CREATE INDEX actions_incident_due
  ON actions(incident_id, due_on) WHERE incident_id IS NOT NULL;

CREATE OR REPLACE FUNCTION set_action_site() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_site uuid;
BEGIN
  IF NEW.finding_id IS NOT NULL THEN
    SELECT site_id INTO linked_site FROM findings WHERE id = NEW.finding_id;
  ELSIF NEW.commission_id IS NOT NULL THEN
    SELECT site_id INTO linked_site FROM commissions WHERE id = NEW.commission_id;
  ELSIF NEW.incident_id IS NOT NULL THEN
    SELECT site_id INTO linked_site FROM incidents WHERE id = NEW.incident_id;
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

DROP TRIGGER actions_set_site ON actions;
CREATE TRIGGER actions_set_site
  BEFORE INSERT OR UPDATE OF finding_id, commission_id, incident_id, site_id ON actions
  FOR EACH ROW EXECUTE FUNCTION set_action_site();

DROP VIEW commitments;
CREATE VIEW commitments AS
  SELECT a.id,
    CASE
      WHEN a.incident_id IS NOT NULL THEN 'INCIDENT'::text
      WHEN a.commission_id IS NOT NULL THEN 'COMMISSION'::text
      ELSE 'INSPECTION'::text
    END AS source,
    COALESCE(a.incident_id, a.commission_id, i.id) AS source_id,
    a.title, a.owner_id, a.site_id, a.due_on, a.status,
    (a.status = 'CLOSED') AS closed, a.closed_at
  FROM actions a
  LEFT JOIN inspections i ON i.id = (
    SELECT f.inspection_id FROM findings f WHERE f.id = a.finding_id
  )
  WHERE a.finding_id IS NOT NULL
     OR a.commission_id IS NOT NULL
     OR a.incident_id IS NOT NULL
  UNION ALL
  SELECT a.id, 'MEETING'::text AS source, m.meeting_id AS source_id,
    a.title, a.owner_id, m.site_id, a.due_on, a.status,
    (a.status = 'COMPLETED') AS closed, a.closed_at
  FROM agreements a
  JOIN minutes m ON m.id = a.minute_id
  WHERE m.meeting_id IS NOT NULL;
