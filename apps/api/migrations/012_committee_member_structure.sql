ALTER TABLE members
  ADD COLUMN member_kind text NOT NULL DEFAULT 'REPRESENTATIVE',
  ADD COLUMN office text;

ALTER TABLE members
  ALTER COLUMN representation DROP NOT NULL,
  ALTER COLUMN participation DROP NOT NULL;

UPDATE members
SET member_kind = 'PREVENTION_EXPERT',
    representation = NULL,
    participation = NULL,
    role = 'Experto en prevención'
WHERE participation = 'ADVISER'
   OR lower(trim(role)) IN ('asesor sin voto', 'experto en prevención', 'experta en prevención');

UPDATE members
SET office = CASE lower(trim(role))
  WHEN 'presidente' THEN 'PRESIDENT'
  WHEN 'presidenta' THEN 'PRESIDENT'
  WHEN 'secretario' THEN 'SECRETARY'
  WHEN 'secretaria' THEN 'SECRETARY'
  ELSE NULL
END
WHERE member_kind = 'REPRESENTATIVE';

ALTER TABLE members DROP CONSTRAINT members_participation_check;
ALTER TABLE members
  ADD CONSTRAINT members_kind_seat_check CHECK (
    (member_kind = 'REPRESENTATIVE'
      AND representation IS NOT NULL
      AND participation IS NOT NULL
      AND representation IN ('WORKER', 'EMPLOYER')
      AND participation IN ('PRINCIPAL', 'ALTERNATE'))
    OR
    (member_kind = 'PREVENTION_EXPERT'
      AND representation IS NULL
      AND participation IS NULL)
  ),
  ADD CONSTRAINT members_kind_check CHECK (member_kind IN ('REPRESENTATIVE', 'PREVENTION_EXPERT')),
  ADD CONSTRAINT members_office_check CHECK (office IS NULL OR office IN ('PRESIDENT', 'SECRETARY')),
  ADD CONSTRAINT members_office_representative_check CHECK (office IS NULL OR member_kind = 'REPRESENTATIVE');

CREATE INDEX members_committee_seat_period
  ON members(committee_id, member_kind, representation, participation, valid_from, valid_until);
