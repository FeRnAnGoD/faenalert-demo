CREATE TABLE platform_roles (
  code text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL
);

CREATE TABLE user_platform_access (
  user_id uuid NOT NULL REFERENCES users,
  role_code text NOT NULL REFERENCES platform_roles(code),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users,
  PRIMARY KEY(user_id, role_code)
);

INSERT INTO platform_roles(code,name,description) VALUES
  ('PLATFORM_ADMIN','Administrador de plataforma','Administra empresas, faenas y asignaciones de acceso en este entorno.');

ALTER TABLE organizations
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN updated_at timestamptz;

ALTER TABLE sites
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN updated_at timestamptz;

ALTER TABLE site_access
  ADD COLUMN granted_at timestamptz,
  ADD COLUMN granted_by uuid REFERENCES users,
  ADD COLUMN revoked_at timestamptz,
  ADD COLUMN revoked_by uuid REFERENCES users,
  ADD CONSTRAINT site_access_revocation_pair CHECK ((revoked_at IS NULL) = (revoked_by IS NULL));

CREATE TABLE site_access_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites,
  user_id uuid NOT NULL REFERENCES users,
  actor_id uuid NOT NULL REFERENCES users,
  role text NOT NULL REFERENCES roles(code),
  event text NOT NULL CHECK(event IN ('GRANTED','ROLE_CHANGED','REVOKED')),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION protect_site_access_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Site access history is append-only'; END $$;
CREATE TRIGGER site_access_events_append_only
  BEFORE UPDATE OR DELETE ON site_access_events
  FOR EACH ROW EXECUTE FUNCTION protect_site_access_events();

CREATE INDEX site_access_active_user ON site_access(user_id,site_id) WHERE revoked_at IS NULL;
CREATE INDEX site_access_history_site ON site_access_events(site_id,created_at DESC,id DESC);
CREATE INDEX sites_organization_active ON sites(organization_id,name) WHERE active;
CREATE UNIQUE INDEX organizations_name_ci_unique ON organizations(lower(name));
CREATE UNIQUE INDEX sites_organization_name_ci_unique ON sites(organization_id,lower(name));

INSERT INTO user_platform_access(user_id,role_code,granted_by)
SELECT id,'PLATFORM_ADMIN',id FROM users WHERE email='admin@demo.local'
ON CONFLICT(user_id,role_code) DO NOTHING;
