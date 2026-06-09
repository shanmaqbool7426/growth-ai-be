import type { Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Transaction } from "../models/Transaction.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { ORDER_STATUS } from "../constants/index.js";
import type { AuthRequest } from "../middleware/auth.js";

const ACTIVE_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.PARTIAL];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatPlatformLabel(platform: string) {
  const raw = (platform ?? "other").trim();
  if (!raw) return "Other";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function computeTrend(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return undefined;
    return { value: `+${current}`, up: true };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

function activityTypeFromTransaction(type: string) {
  if (type === "deposit") return "deposit";
  if (type === "order_payment") return "order";
  if (type === "refund") return "refund";
  return "withdraw";
}

export async function getDashboardStats(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(userId).select("balance");
  if (!user) return sendError(res, "User not found", 404);

  const now = new Date();
  const thirtyDaysAgo = startOfDay(new Date(now));
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const sevenDaysAgo = startOfDay(new Date(now));
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const fourteenDaysAgo = startOfDay(new Date(now));
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

  const [
    totalOrders,
    activeOrders,
    spentAgg,
    dailyOrders,
    platformAgg,
    prevWeekOrders,
    thisWeekOrders,
    prevWeekSpent,
    thisWeekSpent,
    recentOrders,
    recentTransactions,
  ] = await Promise.all([
    Order.countDocuments({ user: userId }),
    Order.countDocuments({ user: userId, status: { $in: ACTIVE_STATUSES } }),
    Order.aggregate([
      { $match: { user: userObjectId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Order.aggregate([
      { $match: { user: userObjectId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { user: userObjectId } },
      { $group: { _id: "$serviceSnapshot.platform", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Order.countDocuments({
      user: userId,
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    }),
    Order.countDocuments({ user: userId, createdAt: { $gte: sevenDaysAgo } }),
    Order.aggregate([
      {
        $match: {
          user: userObjectId,
          createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Order.aggregate([
      { $match: { user: userObjectId, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("refOrderId serviceSnapshot status amount createdAt"),
    Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("type amount description refId createdAt status"),
  ]);

  const dailyMap = new Map<string, { orders: number; revenue: number }>();
  for (const row of dailyOrders) {
    dailyMap.set(String(row._id), {
      orders: Number(row.orders ?? 0),
      revenue: Number(row.revenue ?? 0),
    });
  }

  const analytics = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(thirtyDaysAgo);
    day.setDate(day.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const found = dailyMap.get(key);
    return {
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: found?.orders ?? 0,
      revenue: found?.revenue ?? 0,
    };
  });

  const totalPlatformOrders = platformAgg.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  const serviceDistribution = platformAgg
    .map((row) => {
      const count = Number(row.count ?? 0);
      return {
        name: formatPlatformLabel(String(row._id ?? "other")),
        platform: String(row._id ?? "other").toLowerCase(),
        value:
          totalPlatformOrders > 0 ? Math.round((count / totalPlatformOrders) * 100) : 0,
        count,
      };
    })
    .filter((row) => row.count > 0);

  const orderActivity = recentOrders.map((order) => {
    const ref = order.refOrderId ?? String(order._id);
    const statusText =
      order.status === ORDER_STATUS.COMPLETED
        ? "completed"
        : order.status === ORDER_STATUS.CANCELED
          ? "canceled"
          : order.status === ORDER_STATUS.FAILED
            ? "failed"
            : "placed";
    return {
      id: `order-${ref}`,
      text: `Order ${ref} ${statusText} — ${order.serviceSnapshot.name}`,
      at: (order as typeof order & { createdAt: Date }).createdAt,
      type: "order" as const,
    };
  });

  const transactionActivity = recentTransactions.map((tx) => ({
    id: `tx-${tx.refId}`,
    text: tx.description || `${tx.type} of ${Math.abs(tx.amount)}`,
    at: (tx as typeof tx & { createdAt: Date }).createdAt,
    type: activityTypeFromTransaction(tx.type),
  }));

  const activity = [...orderActivity, ...transactionActivity]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  const prevRevenue = analytics.slice(0, 15).reduce((sum, row) => sum + row.revenue, 0);
  const thisRevenue = analytics.slice(15).reduce((sum, row) => sum + row.revenue, 0);

  return sendSuccess(res, {
    balance: user.balance,
    totalOrders,
    activeOrders,
    totalSpent: spentAgg[0]?.total ?? 0,
    analytics,
    serviceDistribution,
    activity,
    trends: {
      orders: computeTrend(thisWeekOrders, prevWeekOrders),
      spent: computeTrend(thisWeekSpent[0]?.total ?? 0, prevWeekSpent[0]?.total ?? 0),
      revenue: computeTrend(thisRevenue, prevRevenue),
    },
  });
}
