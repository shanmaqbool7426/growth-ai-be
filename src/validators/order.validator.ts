import { z } from "zod";

export const placeOrderSchema = z.object({
  serviceId: z.string().min(1),
  link: z.string().url("Must be a valid URL"),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  dripFeed: z
    .object({
      enabled: z.boolean(),
      interval: z.number().positive().optional(),
      runs: z.number().positive().optional(),
    })
    .optional(),
});

export const massOrderSchema = z.object({
  orders: z.array(placeOrderSchema).min(1).max(50),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "partial", "canceled", "failed"]),
  startCount: z.number().optional(),
  remains: z.number().optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
