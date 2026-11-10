import { z } from "zod";
export const committeeSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    validFrom: z.iso.date(),
    validUntil: z.iso.date().optional(),
  })
  .strict()
  .refine((v) => !v.validUntil || v.validUntil >= v.validFrom, {
    message: "El fin del período debe ser posterior al inicio",
  });
export const memberSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    job: z.string().trim().min(1).max(200).default("Cargo de demostración"),
    role: z.string().trim().min(1).max(100).default("Integrante"),
    contactEmail: z.email().default("integrante@demo.local"),
    personId: z.uuid().optional(),
    memberKind: z.enum(["REPRESENTATIVE", "PREVENTION_EXPERT"]).default("REPRESENTATIVE"),
    office: z.enum(["PRESIDENT", "SECRETARY"]).nullable().optional(),
    representation: z.enum(["WORKER", "EMPLOYER"]).nullable().optional(),
    participation: z.enum(["PRINCIPAL", "ALTERNATE"]).nullable().optional(),
    validFrom: z.iso.date(),
    validUntil: z.iso.date().optional(),
  })
  .strict()
  .superRefine((v, context) => {
    if (!v.validUntil || v.validUntil >= v.validFrom) {
      // Date range is valid.
    } else {
      context.addIssue({ code: "custom", path: ["validUntil"], message: "Período de participación inválido" });
    }
    if (v.memberKind === "REPRESENTATIVE" && (!v.representation || !v.participation)) {
      context.addIssue({ code: "custom", path: ["participation"], message: "Un representante requiere representación y calidad de titular o suplente" });
    }
    if (v.memberKind === "PREVENTION_EXPERT" && (v.representation || v.participation || v.office)) {
      context.addIssue({ code: "custom", path: ["memberKind"], message: "El experto en prevención participa como asesor sin representación ni cargo del comité" });
    }
  });
export const memberUpdateSchema = z
  .object({
    version: z.number().int().positive(),
    job: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(100),
    contactEmail: z.email(),
    memberKind: z.enum(["REPRESENTATIVE", "PREVENTION_EXPERT"]).default("REPRESENTATIVE"),
    office: z.enum(["PRESIDENT", "SECRETARY"]).nullable().default(null),
    representation: z.enum(["WORKER", "EMPLOYER"]).nullable(),
    participation: z.enum(["PRINCIPAL", "ALTERNATE"]).nullable(),
  })
  .strict()
  .superRefine((v, context) => {
    if (v.memberKind === "REPRESENTATIVE" && (!v.representation || !v.participation)) {
      context.addIssue({ code: "custom", path: ["participation"], message: "Un representante requiere representación y calidad de titular o suplente" });
    }
    if (v.memberKind === "PREVENTION_EXPERT" && (v.representation || v.participation || v.office)) {
      context.addIssue({ code: "custom", path: ["memberKind"], message: "El experto en prevención participa como asesor sin representación ni cargo del comité" });
    }
  });
export type CommitteeInput = z.infer<typeof committeeSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
