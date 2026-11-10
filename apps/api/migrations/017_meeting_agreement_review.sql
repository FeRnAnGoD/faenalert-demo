-- Agreements use the same provisional evidence and independent review flow as
-- preventive actions. Existing completed agreements are retained as historical
-- state; no verification is inferred for records created before this migration.
ALTER TABLE agreements DROP CONSTRAINT agreements_status_check;
ALTER TABLE agreements
  ADD CONSTRAINT agreements_status_check
  CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED'));

ALTER TABLE evidence ALTER COLUMN action_id DROP NOT NULL;
ALTER TABLE evidence ADD COLUMN agreement_id uuid REFERENCES agreements;
ALTER TABLE evidence
  ADD CONSTRAINT evidence_exactly_one_parent
  CHECK (num_nonnulls(action_id, agreement_id) = 1);
CREATE INDEX evidence_agreement_history
  ON evidence(agreement_id, created_at DESC, id)
  WHERE agreement_id IS NOT NULL;

ALTER TABLE verifications ALTER COLUMN action_id DROP NOT NULL;
ALTER TABLE verifications ADD COLUMN agreement_id uuid REFERENCES agreements;
ALTER TABLE verifications
  ADD CONSTRAINT verifications_exactly_one_parent
  CHECK (num_nonnulls(action_id, agreement_id) = 1);
CREATE INDEX verifications_agreement_history
  ON verifications(agreement_id, created_at DESC, id)
  WHERE agreement_id IS NOT NULL;

CREATE FUNCTION prevent_workflow_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END $$;
CREATE TRIGGER evidence_append_only
  BEFORE UPDATE OR DELETE ON evidence
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_log_mutation();
CREATE TRIGGER verifications_append_only
  BEFORE UPDATE OR DELETE ON verifications
  FOR EACH ROW EXECUTE FUNCTION prevent_workflow_log_mutation();
