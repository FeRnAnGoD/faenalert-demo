import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

export const trainingParticipantCreateSchema = z
  .object({ participant_name: text(200) })
  .strict();

export const trainingParticipantUpdateSchema = z
  .object({
    version: z.number().int().positive(),
    participant_name: text(200).optional(),
    attended: z.boolean().nullable().optional(),
  })
  .strict()
  .refine(
    (input) => input.participant_name !== undefined || input.attended !== undefined,
    "Indica el nombre o la asistencia para actualizar",
  );

export const trainingEvidenceSchema = z
  .object({ description: text(10000) })
  .strict();

export const incidentTimelineEntrySchema = z
  .object({
    eventAt: z.iso.datetime({ offset: true }),
    description: text(10000),
  })
  .strict();
