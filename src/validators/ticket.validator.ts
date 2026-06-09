import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(["refill", "refund", "speed_up", "wrong_link", "other"]),
  message: z.string().min(10),
  relatedOrder: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const replyTicketSchema = z.object({
  message: z.string().min(1),
});
