import { z } from 'zod';

export const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 characters"),
  zip_code: z.string().min(5, "ZIP code is required"),
  property_type: z.string().optional(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  square_footage: z.number().int().positive().optional().nullable(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().min(0).optional().nullable(),
  lot_acres: z.number().min(0).optional().nullable(),
  lawn_sqft: z.number().int().min(0).optional().nullable(),
  hvac_system_count: z.number().int().min(0).optional().nullable(),
  water_heater_type: z.string().optional().nullable(),
  pool_type: z.string().optional().nullable(),
  last_hvac_service: z.string().optional().nullable(),
  last_plumbing_service: z.string().optional().nullable(),
  last_lawn_service: z.string().optional().nullable(),
  pets: z.string().optional().nullable(),
  gate_code: z.string().optional().nullable(),
  access_notes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_primary: z.boolean().default(false)
});

export type PropertyFormData = z.infer<typeof propertySchema>;
