import { z } from "zod";
const text = z.string().trim().min(1).max(10000);
export const domains = {
  meetings: z
    .object({
      title: text,
      committee_id: z.uuid(),
      scheduled_at: z.iso.datetime({ offset: true }),
      location: text,
      agenda: text,
      status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED"]).default("PLANNED"),
    })
    .strict(),
  minutes: z
    .object({
      title: text,
      content: text,
      status: z.enum(["DRAFT", "IN_REVIEW"]).default("DRAFT"),
    })
    .strict(),
  trainings: z
    .object({
      title: text,
      scheduled_at: z.iso.datetime({ offset: true }),
      instructor: text,
      description: text,
    })
    .strict(),
  commissions: z.object({ title: text, objective: text }).strict(),
  incidents: z
    .object({
      title: text,
      occurred_at: z.iso.datetime({ offset: true }),
      location: text,
      facts: text,
      kind: z.enum(["INCIDENT", "ACCIDENT", "OBSERVATION"]),
    })
    .strict(),
  documents: z.object({ title: text, description: text }).strict(),
} as const;
export type Domain = keyof typeof domains;
export function domain(value: string): Domain {
  return z
    .enum([
      "meetings",
      "minutes",
      "trainings",
      "commissions",
      "incidents",
      "documents",
    ])
    .parse(value);
}
