import { z } from "zod";

export const exitInterviewSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  interviewerId: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional(),
  sendForm: z.boolean().optional(),
  formTemplateId: z.string().optional(),
  formTiming: z.enum(['NOW', 'ON_DATE']).optional(),
});
