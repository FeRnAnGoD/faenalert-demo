ALTER TABLE incidents
  ADD CONSTRAINT incidents_id_site_unique UNIQUE (id, site_id);

CREATE TABLE incident_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites,
  event_at timestamptz NOT NULL,
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 10000),
  recorded_by uuid NOT NULL REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (incident_id, site_id) REFERENCES incidents(id, site_id)
);

CREATE INDEX incident_timeline_history
  ON incident_timeline(incident_id, event_at, created_at, id);

CREATE FUNCTION prevent_incident_timeline_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'incident_timeline is append-only';
END $$;

CREATE TRIGGER incident_timeline_append_only
  BEFORE UPDATE OR DELETE ON incident_timeline
  FOR EACH ROW EXECUTE FUNCTION prevent_incident_timeline_mutation();
