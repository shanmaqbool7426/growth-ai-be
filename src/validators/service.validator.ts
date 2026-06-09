import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(2).max(200),
  platform: z.string().min(1).max(50),
  category: z.string().min(1).max(100),
  pricePerThousand: z.number().positive(),
  minQuantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive(),
  avgDeliveryTime: z.string().min(1),
  refillSupport: z.boolean().optional(),
  qualityLabel: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();
