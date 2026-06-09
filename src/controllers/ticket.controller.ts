import type { Response } from "express";
import { Ticket, TicketReply } from "../models/Ticket.js";
import { sendSuccess, sendError, paginationMeta } from "../utils/apiResponse.js";
import { createTicketSchema, replyTicketSchema } from "../validators/ticket.validator.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function createTicket(req: AuthRequest, res: Response) {
  const body = createTicketSchema.parse(req.body);
  const { message, ...ticketData } = body;

  const ticket = await Ticket.create({ ...ticketData, user: req.user!.userId });
  await TicketReply.create({
    ticket: ticket._id,
    sender: req.user!.userId,
    senderRole: "user",
    message,
  });

  return sendSuccess(res, ticket, "Ticket created", 201);
}

export async function getTickets(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20", status } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, parseInt(limit));
  const skip = (p - 1) * l;

  const filter: Record<string, unknown> = {};
  if (req.user!.role !== "admin") filter.user = req.user!.userId;
  if (status) filter.status = status;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter).populate("user", "name email").skip(skip).limit(l).sort({ createdAt: -1 }),
    Ticket.countDocuments(filter),
  ]);

  return sendSuccess(res, tickets, "Tickets fetched", 200, paginationMeta(p, l, total));
}

export async function getTicketById(req: AuthRequest, res: Response) {
  const filter: Record<string, unknown> = { _id: req.params["id"] };
  if (req.user!.role !== "admin") filter.user = req.user!.userId;

  const ticket = await Ticket.findOne(filter).populate("user", "name email");
  if (!ticket) return sendError(res, "Ticket not found", 404);

  const replies = await TicketReply.find({ ticket: ticket._id })
    .populate("sender", "name role avatar")
    .sort({ createdAt: 1 });

  return sendSuccess(res, { ticket, replies });
}

export async function replyToTicket(req: AuthRequest, res: Response) {
  const { message } = replyTicketSchema.parse(req.body);
  const filter: Record<string, unknown> = { _id: req.params["id"] };
  if (req.user!.role !== "admin") filter.user = req.user!.userId;

  const ticket = await Ticket.findOne(filter);
  if (!ticket) return sendError(res, "Ticket not found", 404);
  if (ticket.status === "closed") return sendError(res, "Cannot reply to a closed ticket", 400);

  const reply = await TicketReply.create({
    ticket: ticket._id,
    sender: req.user!.userId,
    senderRole: req.user!.role === "admin" ? "admin" : "user",
    message,
  });

  return sendSuccess(res, reply, "Reply added", 201);
}

export async function closeTicket(req: AuthRequest, res: Response) {
  const filter: Record<string, unknown> = { _id: req.params["id"] };
  if (req.user!.role !== "admin") filter.user = req.user!.userId;

  const ticket = await Ticket.findOneAndUpdate(
    filter,
    { status: "closed", closedAt: new Date() },
    { new: true }
  );
  if (!ticket) return sendError(res, "Ticket not found", 404);
  return sendSuccess(res, ticket, "Ticket closed");
}

export async function reopenTicket(req: AuthRequest, res: Response) {
  const filter: Record<string, unknown> = { _id: req.params["id"] };
  if (req.user!.role !== "admin") filter.user = req.user!.userId;

  const ticket = await Ticket.findOneAndUpdate(filter, { status: "open", closedAt: undefined }, { new: true });
  if (!ticket) return sendError(res, "Ticket not found", 404);
  return sendSuccess(res, ticket, "Ticket reopened");
}
