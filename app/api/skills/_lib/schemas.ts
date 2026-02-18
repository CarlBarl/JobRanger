import { z } from 'zod'

export const RequestSchema = z.object({
  documentId: z.string().min(1),
})

export const UpdateSkillsSchema = z.object({
  documentId: z.string().min(1),
  skills: z.array(z.string().trim().min(1).max(100)).max(100),
})
