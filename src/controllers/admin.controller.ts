import type { Response } from "express";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Transaction } from "../models/Transaction.js";
import { Ticket } from "../models/Ticket.js";
import { Service } from "../models/Service.js";
import { sendSuccess, sendError, paginationMeta } from "../utils/apiResponse.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const updateUserSchema = z.object({
  status: z.enum(["active", "suspended", "banned"]).optional(),
  role: z.enum(["user", "agency", "admin"]).optional(),
  name: z.string().optional(),
});

export async function getStats(req: AuthRequest, res: Response) {
  const [totalUsers, totalOrders, totalServices, totalTickets, revenueAgg] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Service.countDocuments({ isActive: true }),
    Ticket.countDocuments({ status: "open" }),
    Transaction.aggregate([
      { $match: { type: "deposit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const ordersByStatus = await Order.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  return sendSuccess(res, {
    totalUsers,
    totalOrders,
    totalServices,
    openTickets: totalTickets,
    totalRevenue: revenueAgg[0]?.total ?? 0,
    ordersByStatus: ordersByStatus.reduce((acc: Record<string, number>, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {}),
  });
}

export async function getUsers(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20", role, status, search } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, parseInt(limit));
  const skip = (p - 1) * l;

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }, { username: new RegExp(search, "i") }];

  const [users, total] = await Promise.all([
    User.find(filter).select("-password").skip(skip).limit(l).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, users, "Users fetched", 200, paginationMeta(p, l, total));
}

export async function getUserById(req: AuthRequest, res: Response) {
  const user = await User.findById(req.params["id"]).select("-password");
  if (!user) return sendError(res, "User not found", 404);
  return sendSuccess(res, user);
}

export async function updateUser(req: AuthRequest, res: Response) {
  const body = updateUserSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(req.params["id"], body, { new: true }).select("-password");
  if (!user) return sendError(res, "User not found", 404);
  return sendSuccess(res, user, "User updated");
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const user = await User.findByIdAndDelete(req.params["id"]);
  if (!user) return sendError(res, "User not found", 404);
  return sendSuccess(res, null, "User deleted");
}

export async function getAdminTransactions(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20", type, userId } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, parseInt(limit));
  const skip = (p - 1) * l;

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (userId) filter.user = userId;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).populate("user", "name email").populate("relatedOrder", "refOrderId").skip(skip).limit(l).sort({ createdAt: -1 }),
    Transaction.countDocuments(filter),
  ]);

  return sendSuccess(res, transactions, "Transactions fetched", 200, paginationMeta(p, l, total));
}
