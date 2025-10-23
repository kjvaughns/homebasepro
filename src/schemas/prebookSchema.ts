import { z } from 'zod';

export const prebookSchema = z.object({
  issue_description: z.string().min(10, "Please describe the issue in at least 10 characters"),
  urgency_level: z.enum(['low', 'medium', 'high', 'emergency']),
  has_pets: z.boolean(),
  pet_details: z.string().optional(),
  access_notes: z.string().optional(),
  gate_code: z.string().optional(),
  preferred_contact: z.enum(['phone', 'text', 'app']).default('app'),
  special_instructions: z.string().optional()
});

export type PreBookData = z.infer<typeof prebookSchema>;
