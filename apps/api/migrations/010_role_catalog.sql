CREATE TABLE roles (
  code text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  permissions text[] NOT NULL,
  CHECK (
    cardinality(permissions) > 0
    AND 'read' = ANY(permissions)
    AND permissions <@ ARRAY['read','write','review','manage']::text[]
  )
);

INSERT INTO roles(code,name,description,permissions) VALUES
  ('ADMIN','Administrador de faena','Administra el espacio y puede revisar acciones.',ARRAY['read','write','review','manage']),
  ('EDITOR','Editor de faena','Gestiona registros de la faena asignada.',ARRAY['read','write']),
  ('REVIEWER','Verificador','Revisa acciones pendientes sin administrar la faena.',ARRAY['read','review']),
  ('VIEWER','Solo lectura','Consulta la información permitida de la faena.',ARRAY['read']);

ALTER TABLE site_access DROP CONSTRAINT site_access_role_check;
ALTER TABLE site_access
  ADD CONSTRAINT site_access_role_fk FOREIGN KEY (role) REFERENCES roles(code);
