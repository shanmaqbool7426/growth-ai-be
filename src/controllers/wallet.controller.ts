import type { Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { sendSuccess, sendError, paginationMeta } from "../utils/apiResponse.js";
import { generateTransactionRef } from "../utils/generateCode.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const addFundsSchema = z.object({
  amount: z.number().positive().max(100000),
  description: z.string().optional(),
});

const adjustBalanceSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  description: z.string().min(1),
});

export async function getWallet(req: AuthRequest, res: Response) {
  const user = await User.findById(req.user!.userId).select("balance name email");
  if (!user) return sendError(res, "User not found", 404);
  return sendSuccess(res, { balance: user.balance });
}

export async function addFunds(req: AuthRequest, res: Response) {
  const { amount, description } = addFundsSchema.parse(req.body);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const user = await User.findById(req.user!.userId).session(session);
    if (!user) { await session.abortTransaction(); return sendError(res, "User not found", 404); }

    const balanceBefore = user.balance;
    user.balance = parseFloat((user.balance + amount).toFixed(4));
    await user.save({ session });

    await Transaction.create([{
      user: user._id,
      type: "deposit",
      amount,
      balanceBefore,
      balanceAfter: user.balance,
      refId: generateTransactionRef(),
      description: description || `Wallet deposit of $${amount}`,
      status: "completed",
    }], { session });

    await session.commitTransaction();
    return sendSuccess(res, { balance: user.balance }, "Funds added successfully");
  } catch (err) {
    await session.abortTransaction();
    return sendError(res, (err as Error).message, 500);
  } finally {
    session.endSession();
  }
}

export async function getTransactions(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20", type } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (p - 1) * l;

  const filter: Record<string, unknown> = { user: req.user!.userId };
  if (type) filter.type = type;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).skip(skip).limit(l).sort({ createdAt: -1 }),
    Transaction.countDocuments(filter),
  ]);

  return sendSuccess(res, transactions, "Transactions fetched", 200, paginationMeta(p, l, total));
}

// Admin: adjust any user's balance
export async function adminAdjustBalance(req: AuthRequest, res: Response) {
  const { userId, amount, description } = adjustBalanceSchema.parse(req.body);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const user = await User.findById(userId).session(session);
    if (!user) { await session.abortTransaction(); return sendError(res, "User not found", 404); }
    if (user.balance + amount < 0) { await session.abortTransaction(); return sendError(res, "Balance cannot go negative", 400); }

    const balanceBefore = user.balance;
    user.balance = parseFloat((user.balance + amount).toFixed(4));
    await user.save({ session });

    await Transaction.create([{
      user: user._id,
      type: amount > 0 ? "deposit" : "withdrawal",
      amount,
      balanceBefore,
      balanceAfter: user.balance,
      refId: generateTransactionRef(),
      description,
      status: "completed",
      meta: { adjustedByAdmin: true },
    }], { session });

    await session.commitTransaction();
    return sendSuccess(res, { balance: user.balance }, "Balance adjusted");
  } catch (err) {
    await session.abortTransaction();
    return sendError(res, (err as Error).message, 500);
  } finally {
    session.endSession();
  }
}
