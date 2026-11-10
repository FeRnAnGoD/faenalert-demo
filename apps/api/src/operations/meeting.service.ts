import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { z } from "zod";
import { DomainContext } from "../common/domain-context";
import { Actor } from "../auth/auth";
import {
  id,
  pagination,
  verificationSchema,
} from "../prevention/schemas";
import { MeetingRepository } from "./meeting.repository";
const text = z.string().trim().min(1).max(10000);
const agreementEvidenceInput = z.object({ description: text }).strict();
const agendaInput = z.object({
  version: z.number().int().positive(),
  agenda: z.string().trim().min(1).max(10000),
}).strict();
const attendanceInput = z.object({
  attendance: z.array(z.object({ memberId: id, present: z.boolean() }).strict()).max(200),
}).strict().refine((input) => new Set(input.attendance.map((item) => item.memberId)).size === input.attendance.length, "Integrante repetido en la asistencia");
@Injectable()
export class MeetingService {
  constructor(
    @Inject(DomainContext) private context: DomainContext,
    @Inject(MeetingRepository) private repo: MeetingRepository,
  ) {}
  workspace(actor: Actor, meetingId: string, query: unknown) {
    const q = z
      .object({
        historyPage: z.coerce.number().int().min(1).default(1),
        agreementsPage: z.coerce.number().int().min(1).default(1),
      })
      .parse(query);
    return this.context.db.read(async (c) => {
      const meeting = await this.repo.meeting(c, id.parse(meetingId));
      if (!meeting) throw new NotFoundException();
      await this.context.access(c, actor, meeting.site_id);
      const minute = await this.repo.minuteForMeeting(c, meetingId);
      const agreementsPage = minute
        ? await this.repo.agreements(c, minute.id, q.agreementsPage)
        : { items: [], page: q.agreementsPage, pageSize: 20, total: 0 };
      const historyPage = await this.repo.history(
        c,
        meeting.site_id,
        meetingId,
        q.historyPage,
      );
      return {
        meeting,
        minute: minute ?? null,
        agreements: agreementsPage.items,
        agreementsPage,
        history: historyPage.items,
        historyPage,
      };
    });
  }
  attendance(actor: Actor, meetingId: string) {
    return this.context.db.read(async (c) => {
      const meeting = await this.repo.meeting(c, id.parse(meetingId));
      if (!meeting) throw new NotFoundException();
      await this.context.access(c, actor, meeting.site_id);
      const items = (await c.query(
        "SELECT m.id AS member_id,m.name,m.representation,m.participation,COALESCE(a.present,false) AS present FROM members m LEFT JOIN meeting_attendance a ON a.member_id=m.id AND a.meeting_id=$1 WHERE m.committee_id=$2 AND m.valid_from<=(SELECT (scheduled_at AT TIME ZONE s.timezone)::date FROM meetings JOIN sites s ON s.id=meetings.site_id WHERE meetings.id=$1) AND (m.valid_until IS NULL OR m.valid_until>=(SELECT (scheduled_at AT TIME ZONE s.timezone)::date FROM meetings JOIN sites s ON s.id=meetings.site_id WHERE meetings.id=$1)) ORDER BY m.name,m.id",
        [meetingId, meeting.committee_id],
      )).rows;
      return { items };
    });
  }
  saveAttendance(actor: Actor, meetingId: string, body: unknown) {
    const input = attendanceInput.parse(body);
    return this.context.db.transaction(async (c) => {
      const meeting = await this.repo.meeting(c, id.parse(meetingId), true);
      if (!meeting) throw new NotFoundException();
      await this.context.access(c, actor, meeting.site_id, true);
      const ids = input.attendance.map((item) => item.memberId);
      if (ids.length) {
        const result = await c.query(
          "SELECT count(*)::int AS total FROM members WHERE committee_id=$1 AND id=ANY($2::uuid[])",
          [meeting.committee_id, ids],
        );
        if (result.rows[0].total !== ids.length)
          throw new ConflictException("La lista de asistencia no corresponde a este comité");
      }
      for (const item of input.attendance) {
        await c.query(
          "INSERT INTO meeting_attendance(meeting_id,member_id,present,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(meeting_id,member_id) DO UPDATE SET present=EXCLUDED.present,updated_by=EXCLUDED.updated_by,updated_at=now() WHERE meeting_attendance.present IS DISTINCT FROM EXCLUDED.present OR meeting_attendance.updated_by IS DISTINCT FROM EXCLUDED.updated_by",
          [meetingId, item.memberId, item.present, actor.id],
        );
      }
      await this.context.audit(c, actor, meeting.site_id, meetingId, "meeting.attendance.updated", { present: input.attendance.filter((item) => item.present).length, total: input.attendance.length });
      return { saved: input.attendance.length };
    });
  }
  agenda(actor: Actor, meetingId: string, body: unknown) {
    const input = agendaInput.parse(body);
    return this.context.db.transaction(async (c) => {
      const meeting = await this.repo.meeting(c, id.parse(meetingId), true);
      if (!meeting) throw new NotFoundException();
      await this.context.access(c, actor, meeting.site_id, true);
      if (meeting.version !== input.version)
        throw new ConflictException("La reunión cambió; vuelve a cargar la agenda");
      const updated = (await c.query(
        "UPDATE meetings SET agenda=$2,version=version+1 WHERE id=$1 AND version=$3 RETURNING *",
        [meetingId, input.agenda, input.version],
      )).rows[0];
      if (!updated) throw new ConflictException("La reunión cambió; vuelve a cargar la agenda");
      const metadata = await this.context.audit(c, actor, meeting.site_id, meetingId, "meeting.agenda.updated", { fromVersion: input.version, toVersion: updated.version });
      return { ...updated, ...metadata };
    });
  }
  generate(actor: Actor, meetingId: string, body: unknown) {
    const input = z.object({ content: text }).strict().parse(body);
    return this.context.db.transaction(async (c) => {
      const meeting = await this.repo.meeting(c, id.parse(meetingId), true);
      if (!meeting) throw new NotFoundException();
      await this.context.access(c, actor, meeting.site_id, true);
      if (await this.repo.minuteForMeeting(c, meetingId))
        throw new ConflictException("La reunión ya tiene acta");
      const minute = await this.repo.createMinute(
        c,
        meeting.site_id,
        meetingId,
        "Acta · " + meeting.title,
        input.content,
      );
      await c.query(
        "UPDATE meetings SET status='COMPLETED',version=version+1 WHERE id=$1",
        [meetingId],
      );
      await this.repo.revision(c, minute, actor.id);
      const metadata = await this.context.audit(
        c,
        actor,
        meeting.site_id,
        minute.id,
        "minute.created",
        { meetingId },
      );
      return { ...minute, ...metadata };
    });
  }
  draft(actor: Actor, minuteId: string, body: unknown) {
    const input = z
      .object({
        version: z.number().int().positive(),
        content: text,
        status: z.enum(["DRAFT", "IN_REVIEW"]),
      })
      .strict()
      .parse(body);
    return this.context.db.transaction(async (c) => {
      const minute = await this.repo.minute(c, id.parse(minuteId), true);
      if (!minute) throw new NotFoundException();
      await this.context.access(c, actor, minute.site_id, true);
      if (minute.version !== input.version)
        throw new ConflictException("Versión de acta desactualizada");
      const updated = await this.repo.saveMinute(
        c,
        minuteId,
        input.content,
        input.status,
      );
      await this.repo.revision(c, updated, actor.id);
      const metadata = await this.context.audit(
        c,
        actor,
        minute.site_id,
        minuteId,
        "minute.updated",
        {
          fromVersion: minute.version,
          toVersion: updated.version,
          status: input.status,
        },
      );
      return { ...updated, ...metadata };
    });
  }
  revisions(actor: Actor, minuteId: string, query: unknown) {
    const { page } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      const minute = await this.repo.document(c, id.parse(minuteId));
      if (!minute) throw new NotFoundException();
      await this.context.access(c, actor, minute.site_id);
      return this.repo.revisions(c, minuteId, page);
    });
  }
  agreement(actor: Actor, minuteId: string, body: unknown) {
    const input = z
      .object({ title: text, ownerId: id, dueOn: z.iso.date() })
      .strict()
      .parse(body);
    return this.context.db.transaction(async (c) => {
      const minute = await this.repo.minute(c, id.parse(minuteId));
      if (!minute) throw new NotFoundException();
      await this.context.access(c, actor, minute.site_id, true);
      await this.context.access(c, { id: input.ownerId }, minute.site_id, true);
      const row = await this.repo.createAgreement(c, minuteId, input);
      const metadata = await this.context.audit(
        c,
        actor,
        minute.site_id,
        row.id,
        "agreement.created",
        { minuteId },
      );
      return { ...row, ...metadata };
    });
  }
  transition(actor: Actor, agreementId: string, body: unknown) {
    const input = z
      .object({
        version: z.number().int().positive(),
        status: z.enum(["IN_PROGRESS", "PENDING_VERIFICATION"]),
      })
      .strict()
      .parse(body);
    return this.context.db.transaction(async (c) => {
      const agreement = await this.repo.agreement(
        c,
        id.parse(agreementId),
        true,
      );
      if (!agreement) throw new NotFoundException();
      await this.context.access(c, actor, agreement.site_id, true);
      if (
        agreement.version !== input.version ||
        !(
          (agreement.status === "PENDING" && input.status === "IN_PROGRESS") ||
          (agreement.status === "IN_PROGRESS" &&
            input.status === "PENDING_VERIFICATION")
        )
      )
        throw new ConflictException("Estado o versión inválida");
      if (
        input.status === "PENDING_VERIFICATION" &&
        !(await this.repo.agreementHasEvidence(c, agreementId))
      )
        throw new ConflictException(
          "Registra evidencia antes de solicitar cierre",
        );
      const row = await this.repo.transition(c, agreementId, input.status);
      const metadata = await this.context.audit(
        c,
        actor,
        agreement.site_id,
        agreementId,
        "agreement.transition",
        { from: agreement.status, to: input.status },
      );
      return { ...row, ...metadata };
    });
  }
  agreementEvidence(actor: Actor, agreementId: string, query: unknown) {
    const { page } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      const agreement = await this.repo.agreement(c, id.parse(agreementId));
      if (!agreement) throw new NotFoundException();
      await this.context.access(c, actor, agreement.site_id);
      return this.repo.agreementEvidence(c, agreementId, page);
    });
  }
  addAgreementEvidence(actor: Actor, agreementId: string, body: unknown) {
    const input = agreementEvidenceInput.parse(body);
    return this.context.db.transaction(async (c) => {
      const agreement = await this.repo.agreement(
        c,
        id.parse(agreementId),
        true,
      );
      if (!agreement) throw new NotFoundException();
      await this.context.access(c, actor, agreement.site_id, true);
      if (
        agreement.status === "PENDING_VERIFICATION" ||
        agreement.status === "COMPLETED"
      )
        throw new ConflictException(
          "El acuerdo está enviado a revisión o ya fue cerrado",
        );
      const evidence = await this.repo.addAgreementEvidence(
        c,
        agreement.id,
        actor.id,
        input.description,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        agreement.site_id,
        agreement.id,
        "agreement.evidence.created",
      );
      return { ...evidence, ...metadata };
    });
  }
  verifyAgreement(actor: Actor, agreementId: string, body: unknown) {
    const input = verificationSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const visible = await this.repo.agreement(c, id.parse(agreementId));
      if (!visible) throw new NotFoundException();
      await this.context.permissions.authorize(
        c,
        actor,
        visible.site_id,
        "review",
      );
      const agreement = await this.repo.agreement(
        c,
        agreementId,
        true,
      );
      if (!agreement) throw new NotFoundException();
      if (agreement.owner_id === actor.id)
        throw new ForbiddenException(
          "El responsable no puede verificar su propio acuerdo",
        );
      if (
        agreement.status !== "PENDING_VERIFICATION" ||
        agreement.version !== input.version
      )
        throw new ConflictException("Estado o versión de acuerdo inválida");
      await this.repo.verifyAgreement(
        c,
        agreement.id,
        actor.id,
        input.approved,
        input.note,
      );
      const status = input.approved ? "COMPLETED" : "IN_PROGRESS";
      const row = await this.repo.transition(c, agreement.id, status);
      const metadata = await this.context.audit(
        c,
        actor,
        agreement.site_id,
        agreement.id,
        "agreement.verified",
        { approved: input.approved, from: agreement.status, to: status },
      );
      return { ...row, ...metadata };
    });
  }
}
