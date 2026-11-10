ALTER TABLE members ADD COLUMN version integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX members_person_period ON members(committee_id,person_id,valid_from) WHERE person_id IS NOT NULL;
CREATE INDEX members_person ON members(person_id);
CREATE INDEX meetings_site_created_id ON meetings(site_id,created_at DESC,id);
CREATE INDEX actions_open_due ON actions(due_on,owner_id) WHERE status<>'CLOSED';
CREATE INDEX agreements_open_due ON agreements(due_on,owner_id) WHERE status<>'COMPLETED';
