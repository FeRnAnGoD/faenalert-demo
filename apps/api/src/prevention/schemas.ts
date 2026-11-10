import { z } from "zod";
export const id = z.uuid();
const text = z.string().trim().min(1).max(2000);
export const inspectionSchema = z
  .object({
    title: text,
    area: text,
    inspectedOn: z.iso.date(),
    inspectorId: id,
  })
  .strict();
export const findingSchema = z.object({ description: text }).strict();
export const actionSchema = z
  .object({
    title: text,
    ownerId: id,
    dueOn: z.iso.date(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  })
  .strict();
export const transitionSchema = z
  .object({
    version: z.number().int().positive(),
    status: z.enum(["IN_PROGRESS", "PENDING_VERIFICATION"]),
  })
  .strict();
export const verificationSchema = z
  .object({
    version: z.number().int().positive(),
    approved: z.boolean(),
    note: text,
  })
  .strict();
export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export function canTransition(from: string, to: string) {
  return (
    (from === "PENDING" && to === "IN_PROGRESS") ||
    (from === "IN_PROGRESS" && to === "PENDING_VERIFICATION")
  );
}
