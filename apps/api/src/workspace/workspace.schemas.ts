import { z } from "zod";

const name = z.string().trim().min(2).max(160);
const period = z
  .object({
    name: z.string().trim().min(2).max(160),
    validFrom: z.iso.date(),
    validUntil: z.iso.date().optional(),
  })
  .strict()
  .refine((value) => !value.validUntil || value.validUntil >= value.validFrom, {
    path: ["validUntil"],
    message: "La fecha de término debe ser igual o posterior al inicio",
  });

export const organizationCreateSchema = z
  .object({
    name,
    firstSiteName: name,
    committee: period,
  })
  .strict();

export const siteCreateSchema = z
  .object({
    name,
    committee: period,
  })
  .strict();

export const organizationUpdateSchema = z
  .object({
    name,
    active: z.boolean(),
    version: z.number().int().positive(),
  })
  .strict();

export const siteUpdateSchema = z
  .object({
    name,
    active: z.boolean(),
    version: z.number().int().positive(),
  })
  .strict();

export const siteRoleSchema = z
  .object({ role: z.string().trim().min(2).max(40) })
  .strict();

export const uuidSchema = z.uuid();
