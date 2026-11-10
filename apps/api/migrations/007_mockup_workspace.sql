ALTER TABLE members
  ADD COLUMN job text NOT NULL DEFAULT 'Cargo de demostración',
  ADD COLUMN role text NOT NULL DEFAULT 'Integrante',
  ADD COLUMN contact_email text NOT NULL DEFAULT 'integrante@demo.local';

CREATE OR REPLACE VIEW commitments AS
 SELECT a.id,'INSPECTION'::text AS source,i.id AS source_id,a.title,a.owner_id,i.site_id,a.due_on,a.status,(a.status='CLOSED') AS closed,a.closed_at,a.version
 FROM actions a JOIN findings f ON f.id=a.finding_id JOIN inspections i ON i.id=f.inspection_id
 UNION ALL
 SELECT a.id,'MEETING'::text,m.meeting_id,a.title,a.owner_id,m.site_id,a.due_on,a.status,(a.status='COMPLETED'),a.closed_at,a.version
 FROM agreements a JOIN minutes m ON m.id=a.minute_id WHERE m.meeting_id IS NOT NULL;
