import "dotenv/config";
import { Pool } from "pg";
import { hashPassword } from "../src/auth/password";
if (process.env.NODE_ENV === "production")
  throw new Error("Seed disabled in production");
if (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 12)
  throw new Error("Set SEED_PASSWORD (minimum 12 characters)");
if (!process.env.PROMO_VIEWER_PASSWORD || process.env.PROMO_VIEWER_PASSWORD.length < 12)
  throw new Error("Set PROMO_VIEWER_PASSWORD (minimum 12 characters)");
if (!process.env.FAENALERT_ADMIN_PASSWORD || process.env.FAENALERT_ADMIN_PASSWORD.length < 12)
  throw new Error("Set FAENALERT_ADMIN_PASSWORD (minimum 12 characters)");
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const org = "10000000-0000-4000-8000-000000000001",
      site = "20000000-0000-4000-8000-000000000001";
    await c.query(
      "INSERT INTO organizations(id,name) VALUES($1,'Empresa sintética') ON CONFLICT DO NOTHING",
      [org],
    );
    await c.query(
      "INSERT INTO sites(id,organization_id,name) VALUES($1,$2,'Faena demostración') ON CONFLICT DO NOTHING",
      [site, org],
    );
    await c.query(
      "INSERT INTO committees(id,site_id,name,valid_from,valid_until) VALUES('40000000-0000-4000-8000-000000000001',$1,'Comité local sintético','2026-01-01','2027-12-31') ON CONFLICT(id) DO UPDATE SET valid_from=EXCLUDED.valid_from,valid_until=EXCLUDED.valid_until WHERE (committees.valid_from,committees.valid_until) IS DISTINCT FROM (EXCLUDED.valid_from,EXCLUDED.valid_until)",
      [site],
    );
    const accounts = [
      { email: "admin@demo.local", name: "Alex Demo", role: "ADMIN", password: process.env.SEED_PASSWORD },
      { email: "verificador@demo.local", name: "Casey Ejemplo", role: "REVIEWER", password: process.env.SEED_PASSWORD },
      { email: "lector@demo.local", name: "Riley Muestra", role: "VIEWER", password: process.env.SEED_PASSWORD },
      { email: "demo@faenalert.local", name: "FaenaAlert Demo", role: "VIEWER", password: process.env.PROMO_VIEWER_PASSWORD },
      { email: "faenalert-admin@faenalert.local", name: "FaenaAlert Admin", role: "ADMIN", password: process.env.FAENALERT_ADMIN_PASSWORD },
    ];
    for (const [i, account] of accounts.entries()) {
      const user = "30000000-0000-4000-8000-00000000000" + (i + 1);
      await c.query(
        "INSERT INTO people(id,display_name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name",
        [user, account.name],
      );
      await c.query(
        "INSERT INTO users(id,email,name,password_hash,person_id) VALUES($1,$2,$3,$4,$1) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,person_id=EXCLUDED.person_id",
        [
          user,
          account.email,
          account.name,
          hashPassword(account.password!),
        ],
      );
      await c.query(
        "INSERT INTO site_access(site_id,user_id,role,granted_at,granted_by,revoked_at,revoked_by) VALUES($1,$2,$3,now(),$2,NULL,NULL) ON CONFLICT(site_id,user_id) DO UPDATE SET role=EXCLUDED.role,granted_at=CASE WHEN site_access.revoked_at IS NULL AND site_access.role=EXCLUDED.role THEN site_access.granted_at ELSE now() END,granted_by=CASE WHEN site_access.revoked_at IS NULL AND site_access.role=EXCLUDED.role THEN site_access.granted_by ELSE EXCLUDED.granted_by END,revoked_at=NULL,revoked_by=NULL WHERE site_access.role IS DISTINCT FROM EXCLUDED.role OR site_access.revoked_at IS NOT NULL",
        [site, user, account.role],
      );
    }
    await c.query(
      "INSERT INTO user_platform_access(user_id,role_code,granted_at,granted_by) VALUES('30000000-0000-4000-8000-000000000001','PLATFORM_ADMIN',now(),'30000000-0000-4000-8000-000000000001') ON CONFLICT(user_id,role_code) DO NOTHING",
    );
    await c.query(
      "INSERT INTO user_platform_access(user_id,role_code,granted_at,granted_by) VALUES('30000000-0000-4000-8000-000000000005','PLATFORM_ADMIN',now(),'30000000-0000-4000-8000-000000000005') ON CONFLICT(user_id,role_code) DO NOTHING",
    );
    const members = [
      ["d0000000-0000-4000-8000-000000000001", "e0000000-0000-4000-8000-000000000001", "Sam Prueba", "Supervisión de ejemplo", "Presidente", "sam.prueba@demo.local", "WORKER", "PRINCIPAL"],
      ["d0000000-0000-4000-8000-000000000002", "e0000000-0000-4000-8000-000000000002", "Luz Ejemplo", "Operación de práctica", "Secretaria", "luz.ejemplo@demo.local", "WORKER", "PRINCIPAL"],
      ["d0000000-0000-4000-8000-000000000003", "e0000000-0000-4000-8000-000000000003", "Nico Muestra", "Mantenimiento de muestra", "Integrante", "nico.muestra@demo.local", "WORKER", "ALTERNATE"],
      ["d0000000-0000-4000-8000-000000000004", "e0000000-0000-4000-8000-000000000004", "Dana Sintética", "Prevención de ejemplo", "Integrante", "dana.sintetica@demo.local", "EMPLOYER", "PRINCIPAL"],
      ["d0000000-0000-4000-8000-000000000005", "e0000000-0000-4000-8000-000000000005", "Noa Demostración", "Gestión de práctica", "Integrante", "noa.demo@demo.local", "EMPLOYER", "PRINCIPAL"],
      ["d0000000-0000-4000-8000-000000000006", "e0000000-0000-4000-8000-000000000006", "Kai Ficticio", "Operación de muestra", "Integrante", "kai.ficticio@demo.local", "EMPLOYER", "ALTERNATE"],
      ["d0000000-0000-4000-8000-000000000007", "e0000000-0000-4000-8000-000000000007", "René Simulado", "Operación de ejemplo", "Integrante", "rene.simulado@demo.local", "WORKER", "PRINCIPAL"],
      ["d0000000-0000-4000-8000-000000000008", "e0000000-0000-4000-8000-000000000008", "Ari Prueba", "Logística de práctica", "Integrante", "ari.prueba@demo.local", "WORKER", "ALTERNATE"],
      ["d0000000-0000-4000-8000-000000000009", "e0000000-0000-4000-8000-000000000009", "Sol Muestra", "Mantención de ejemplo", "Integrante", "sol.muestra@demo.local", "WORKER", "ALTERNATE"],
      ["d0000000-0000-4000-8000-000000000010", "e0000000-0000-4000-8000-000000000010", "Max Demostración", "Prevención de práctica", "Integrante", "max.demo@demo.local", "EMPLOYER", "PRINCIPAL"],
      ["d0000000-0000-4000-8000-000000000011", "e0000000-0000-4000-8000-000000000011", "Paz Sintética", "Administración de ejemplo", "Integrante", "paz.sintetica@demo.local", "EMPLOYER", "ALTERNATE"],
      ["d0000000-0000-4000-8000-000000000012", "e0000000-0000-4000-8000-000000000012", "Teo Ficticio", "Operación de muestra", "Integrante", "teo.ficticio@demo.local", "EMPLOYER", "ALTERNATE"],
    ];
    for (const [person, member, name, job, role, email, representation, participation] of members) {
      const office =
        role === "Presidente" || role === "Presidenta"
          ? "PRESIDENT"
          : role === "Secretario" || role === "Secretaria"
            ? "SECRETARY"
            : null;
      await c.query(
        "INSERT INTO people(id,display_name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name",
        [person, name],
      );
      await c.query(
        "INSERT INTO members(id,committee_id,name,job,role,contact_email,member_kind,office,representation,participation,valid_from,valid_until,person_id) VALUES($1,'40000000-0000-4000-8000-000000000001',$2,$3,$4,$5,'REPRESENTATIVE',$6,$7,$8,'2026-01-01','2027-12-31',$9) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,job=EXCLUDED.job,role=EXCLUDED.role,contact_email=EXCLUDED.contact_email,member_kind=EXCLUDED.member_kind,office=EXCLUDED.office,representation=EXCLUDED.representation,participation=EXCLUDED.participation,valid_until=EXCLUDED.valid_until WHERE (members.name,members.job,members.role,members.contact_email,members.member_kind,members.office,members.representation,members.participation,members.valid_until) IS DISTINCT FROM (EXCLUDED.name,EXCLUDED.job,EXCLUDED.role,EXCLUDED.contact_email,EXCLUDED.member_kind,EXCLUDED.office,EXCLUDED.representation,EXCLUDED.participation,EXCLUDED.valid_until)",
        [member, name, job, role, email, office, representation, participation, person],
      );
    }
    const expertPerson = "d0000000-0000-4000-8000-000000000013";
    const expertMember = "e0000000-0000-4000-8000-000000000013";
    await c.query(
      "INSERT INTO people(id,display_name) VALUES($1,'Sofía Prevención') ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name",
      [expertPerson],
    );
    await c.query(
      "INSERT INTO members(id,committee_id,name,job,role,contact_email,member_kind,office,representation,participation,valid_from,valid_until,person_id) VALUES($1,'40000000-0000-4000-8000-000000000001','Sofía Prevención','Experta en prevención de riesgos','Experto en prevención','prevencion@demo.local','PREVENTION_EXPERT',NULL,NULL,NULL,'2026-01-01','2027-12-31',$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,job=EXCLUDED.job,role=EXCLUDED.role,contact_email=EXCLUDED.contact_email,member_kind=EXCLUDED.member_kind,office=EXCLUDED.office,representation=EXCLUDED.representation,participation=EXCLUDED.participation,valid_until=EXCLUDED.valid_until WHERE (members.name,members.job,members.role,members.contact_email,members.member_kind,members.office,members.representation,members.participation,members.valid_until) IS DISTINCT FROM (EXCLUDED.name,EXCLUDED.job,EXCLUDED.role,EXCLUDED.contact_email,EXCLUDED.member_kind,EXCLUDED.office,EXCLUDED.representation,EXCLUDED.participation,EXCLUDED.valid_until)",
      [expertMember, expertPerson],
    );
    await c.query(
      "INSERT INTO meetings(id,site_id,committee_id,title,scheduled_at,location,agenda,created_by,updated_by) VALUES('50000000-0000-4000-8000-000000000001',$1,'40000000-0000-4000-8000-000000000001','Reunión ordinaria de demostración',(date_trunc('day',now() AT TIME ZONE 'America/Santiago')+interval '3 days 10 hours') AT TIME ZONE 'America/Santiago','Sala de demostración','Seguimiento de acuerdos anteriores; Revisión de observaciones ficticias; Plan de inspecciones preventivas.', '30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,scheduled_at=EXCLUDED.scheduled_at,location=EXCLUDED.location,agenda=EXCLUDED.agenda WHERE (meetings.title,meetings.scheduled_at,meetings.location,meetings.agenda) IS DISTINCT FROM (EXCLUDED.title,EXCLUDED.scheduled_at,EXCLUDED.location,EXCLUDED.agenda)",
      [site],
    );
    await c.query(
      "INSERT INTO meetings(id,site_id,committee_id,title,scheduled_at,location,agenda,created_by,updated_by) VALUES('50000000-0000-4000-8000-000000000002',$1,'40000000-0000-4000-8000-000000000001','Revisión de inspecciones de demostración',(date_trunc('day',now() AT TIME ZONE 'America/Santiago')-interval '4 days'+interval '10 hours') AT TIME ZONE 'America/Santiago','Sala de ejemplo','Revisar hallazgos y oportunidades de mejora de demostración.','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    await c.query(
      "INSERT INTO meetings(id,site_id,committee_id,title,scheduled_at,location,agenda,created_by,updated_by) VALUES('50000000-0000-4000-8000-000000000003',$1,'40000000-0000-4000-8000-000000000001','Planificación preventiva de ejemplo',(date_trunc('day',now() AT TIME ZONE 'America/Santiago')-interval '11 days'+interval '10 hours') AT TIME ZONE 'America/Santiago','Sala de coordinación ficticia','Acordar acciones preventivas y responsables para el período de muestra.','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    await c.query(
      "INSERT INTO minutes(id,site_id,meeting_id,title,content,status,created_by,updated_by) VALUES('60000000-0000-4000-8000-000000000001',$1,'50000000-0000-4000-8000-000000000001','Acta de demostración · Borrador','Se revisaron los compromisos ficticios del comité y la inspección de ejemplo. Este contenido no representa una sesión real.','DRAFT','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    await c.query(
      "INSERT INTO minute_revisions(minute_id,version,content,actor_id,title,status,meeting_id) VALUES('60000000-0000-4000-8000-000000000001',1,'Se revisaron los compromisos ficticios del comité y la inspección de ejemplo. Este contenido no representa una sesión real.','30000000-0000-4000-8000-000000000001','Acta de demostración · Borrador','DRAFT','50000000-0000-4000-8000-000000000001') ON CONFLICT(minute_id,version) DO NOTHING",
    );
    for (const [minute, meeting, title, content] of [
      ["60000000-0000-4000-8000-000000000002", "50000000-0000-4000-8000-000000000002", "Acta de inspección · Ejemplo", "Registro sintético de una revisión preventiva de muestra. No representa una sesión real."],
      ["60000000-0000-4000-8000-000000000003", "50000000-0000-4000-8000-000000000003", "Acta de planificación · Ejemplo", "Acuerdos ficticios para ilustrar el seguimiento de un comité de demostración."],
    ]) {
      await c.query(
        "INSERT INTO minutes(id,site_id,meeting_id,title,content,status,created_by,updated_by) VALUES($1,$2,$3,$4,$5,'DRAFT','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
        [minute, site, meeting, title, content],
      );
      await c.query(
        "INSERT INTO minute_revisions(minute_id,version,content,actor_id,title,status,meeting_id) VALUES($1,1,$2,'30000000-0000-4000-8000-000000000001',$3,'DRAFT',$4) ON CONFLICT(minute_id,version) DO NOTHING",
        [minute, content, title, meeting],
      );
    }
    await c.query(
      "INSERT INTO agreements(id,minute_id,title,owner_id,due_on,status,created_by,updated_by) VALUES('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','Revisar la señalización del área de práctica','30000000-0000-4000-8000-000000000001',(now() AT TIME ZONE 'America/Santiago')::date+7,'IN_PROGRESS','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
    );
    for (const [id, minute, title, owner, days, status] of [
      ["70000000-0000-4000-8000-000000000002", "60000000-0000-4000-8000-000000000001", "Actualizar el checklist de práctica", "30000000-0000-4000-8000-000000000002", 5, "PENDING"],
      ["70000000-0000-4000-8000-000000000003", "60000000-0000-4000-8000-000000000002", "Revisar la demarcación del área de muestra", "30000000-0000-4000-8000-000000000003", 9, "PENDING"],
      ["70000000-0000-4000-8000-000000000004", "60000000-0000-4000-8000-000000000003", "Compartir la guía preventiva ficticia", "30000000-0000-4000-8000-000000000002", -2, "COMPLETED"],
    ]) {
      await c.query(
        "INSERT INTO agreements(id,minute_id,title,owner_id,due_on,status,created_by,updated_by) VALUES($1,$2,$3,$4,(now() AT TIME ZONE 'America/Santiago')::date+$5::int,$6,'30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
        [id, minute, title, owner, days, status],
      );
    }
    await c.query(
      "INSERT INTO incidents(id,site_id,title,occurred_at,location,facts,kind,created_by,updated_by) VALUES('80000000-0000-4000-8000-000000000001',$1,'Observación preventiva ficticia',now()-interval '2 days','Zona de práctica','Se observó una demarcación de ejemplo pendiente de revisión. Registro sintético, sin personas ni lesiones.','OBSERVATION','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    await c.query(
      "INSERT INTO incidents(id,site_id,title,occurred_at,location,facts,kind,created_by,updated_by) VALUES('80000000-0000-4000-8000-000000000002',$1,'Condición de práctica en revisión',now()-interval '6 days','Área de prueba','Registro sintético para recorrer el flujo. No hubo personas involucradas ni daños reales.','INCIDENT','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    await c.query(
      "INSERT INTO incidents(id,site_id,title,occurred_at,location,facts,kind,created_by,updated_by) VALUES('80000000-0000-4000-8000-000000000003',$1,'Ejercicio de investigación ficticio',now()-interval '12 days','Zona de simulación','Ejemplo didáctico sin personas ni consecuencias reales.','ACCIDENT','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    await c.query(
      "INSERT INTO documents(id,site_id,title,description,created_by,updated_by) VALUES('90000000-0000-4000-8000-000000000001',$1,'Guía ficticia de demostración','Metadatos de ejemplo; no corresponde a un documento oficial.','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    for (const [id, title, description] of [
      ["90000000-0000-4000-8000-000000000002", "Programa preventivo de muestra", "Metadatos ficticios de planificación; no es un programa oficial."],
      ["90000000-0000-4000-8000-000000000003", "Plantilla de acta de demostración", "Referencia de ejemplo sin validez documental."],
      ["90000000-0000-4000-8000-000000000004", "Checklist de inspección ficticio", "Ejemplo de registro local para la demostración."],
      ["90000000-0000-4000-8000-000000000005", "Guía de investigación de muestra", "Contenido sintético. No reemplaza procedimientos aprobados."],
    ]) {
      await c.query(
        "INSERT INTO documents(id,site_id,title,description,created_by,updated_by) VALUES($1,$2,$3,$4,'30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
        [id, site, title, description],
      );
    }
    await c.query(
      "INSERT INTO inspections(id,site_id,title,area,inspected_on,inspector_id,status,created_by,updated_by) VALUES('a0000000-0000-4000-8000-000000000001',$1,'Inspección de demostración','Zona de práctica',(now() AT TIME ZONE 'America/Santiago')::date,'30000000-0000-4000-8000-000000000001','IN_PROGRESS','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
      [site],
    );
    await c.query(
      "INSERT INTO findings(id,inspection_id,description,created_by,updated_by) VALUES('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Revisar la visibilidad de la señalización de práctica. Hallazgo sintético.','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO NOTHING",
    );
    await c.query(
      "INSERT INTO actions(id,finding_id,title,owner_id,due_on,priority,status,created_by,updated_by) VALUES('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Revisar la ubicación de la señalización','30000000-0000-4000-8000-000000000002',(now() AT TIME ZONE 'America/Santiago')::date+5,'MEDIUM','IN_PROGRESS','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO UPDATE SET owner_id=EXCLUDED.owner_id WHERE actions.owner_id IS DISTINCT FROM EXCLUDED.owner_id",
    );
    await c.query(
      "INSERT INTO actions(id,incident_id,title,owner_id,due_on,priority,status,created_by,updated_by) VALUES('c0000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000001','Revisar la demarcación de la zona de práctica','30000000-0000-4000-8000-000000000001',(now() AT TIME ZONE 'America/Santiago')::date+7,'MEDIUM','PENDING','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001') ON CONFLICT(id) DO UPDATE SET owner_id=EXCLUDED.owner_id WHERE actions.owner_id IS DISTINCT FROM EXCLUDED.owner_id",
    );
    await c.query("COMMIT");
    console.log(
      "Synthetic seed ready: admin / verificador / lector @demo.local",
    );
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
