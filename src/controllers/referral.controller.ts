import type { Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { ReferralLedger } from "../models/ReferralLedger.js";
import { Transaction } from "../models/Transaction.js";
import { sendSuccess, sendError, paginationMeta } from "../utils/apiResponse.js";
import { generateTransactionRef } from "../utils/generateCode.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function getReferralStats(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;

  const [referredUsers, ledger] = await Promise.all([
    User.find({ referredBy: userId }).select("name username email createdAt"),
    ReferralLedger.find({ referrer: userId }),
  ]);

  const totalEarned = ledger.reduce((sum, l) => sum + l.commissionAmount, 0);
  const pendingEarnings = ledger.filter((l) => l.status === "pending").reduce((sum, l) => sum + l.commissionAmount, 0);
  const paidEarnings = ledger.filter((l) => l.status === "paid").reduce((sum, l) => sum + l.commissionAmount, 0);

  const user = await User.findById(userId).select("referralCode");

  return sendSuccess(res, {
    referralCode: user?.referralCode,
    referredUsers: referredUsers.length,
    totalEarned: parseFloat(totalEarned.toFixed(4)),
    pendingEarnings: parseFloat(pendingEarnings.toFixed(4)),
    paidEarnings: parseFloat(paidEarnings.toFixed(4)),
    recentReferrals: referredUsers.slice(0, 10),
  });
}

export async function getReferralLedger(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, parseInt(limit));
  const skip = (p - 1) * l;

  const [entries, total] = await Promise.all([
    ReferralLedger.find({ referrer: req.user!.userId })
      .populate("referred", "name username")
      .populate("relatedOrder", "refOrderId amount")
      .skip(skip).limit(l).sort({ createdAt: -1 }),
    ReferralLedger.countDocuments({ referrer: req.user!.userId }),
  ]);

  return sendSuccess(res, entries, "Referral ledger fetched", 200, paginationMeta(p, l, total));
}

export async function withdrawReferralEarnings(req: AuthRequest, res: Response) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const pending = await ReferralLedger.find({ referrer: req.user!.userId, status: "pending" }).session(session);
    if (pending.length === 0) { await session.abortTransaction(); return sendError(res, "No pending referral earnings", 400); }

    const totalAmount = parseFloat(pending.reduce((s, l) => s + l.commissionAmount, 0).toFixed(4));
    const user = await User.findById(req.user!.userId).session(session);
    if (!user) { await session.abortTransaction(); return sendError(res, "User not found", 404); }

    const balanceBefore = user.balance;
    user.balance = parseFloat((user.balance + totalAmount).toFixed(4));
    await user.save({ session });

    await ReferralLedger.updateMany({ _id: { $in: pending.map((l) => l._id) } }, { status: "paid", paidAt: new Date() }, { session });

    await Transaction.create([{
      user: user._id,
      type: "referral_earning",
      amount: totalAmount,
      balanceBefore,
      balanceAfter: user.balance,
      refId: generateTransactionRef(),
      description: `Referral commission withdrawal — ${pending.length} entries`,
      status: "completed",
    }], { session });

    await session.commitTransaction();
    return sendSuccess(res, { withdrawn: totalAmount, newBalance: user.balance }, "Referral earnings withdrawn");
  } catch (err) {
    await session.abortTransaction();
    return sendError(res, (err as Error).message, 500);
  } finally {
    session.endSession();
  }
}
