import type { Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { ReferralLedger } from "../models/ReferralLedger.js";
import { sendSuccess, sendError, paginationMeta } from "../utils/apiResponse.js";
import { generateTransactionRef, generateOrderRef } from "../utils/generateCode.js";
import { placeOrderSchema, massOrderSchema, updateOrderStatusSchema } from "../validators/order.validator.js";
import type { AuthRequest } from "../middleware/auth.js";

const COMMISSION_RATE = 0.05; // 5% referral commission

async function createSingleOrder(
  userId: string,
  serviceId: string,
  link: string,
  quantity: number,
  notes?: string,
  dripFeed?: { enabled: boolean; interval?: number; runs?: number },
  session?: mongoose.ClientSession
) {
  const service = await Service.findById(serviceId).session(session ?? null);
  if (!service || !service.isActive) throw new Error("Service not found or inactive");
  if (quantity < service.minQuantity || quantity > service.maxQuantity) {
    throw new Error(`Quantity must be between ${service.minQuantity} and ${service.maxQuantity}`);
  }

  const amount = parseFloat(((quantity / 1000) * service.pricePerThousand).toFixed(4));
  const user = await User.findById(userId).session(session ?? null);
  if (!user) throw new Error("User not found");
  if (user.balance < amount) throw new Error("Insufficient wallet balance");

  const balanceBefore = user.balance;
  user.balance = parseFloat((user.balance - amount).toFixed(4));
  await user.save({ session });

  const order = new Order({
    user: userId,
    service: service._id,
    serviceSnapshot: {
      name: service.name,
      platform: service.platform,
      category: service.category,
      pricePerThousand: service.pricePerThousand,
    },
    link,
    quantity,
    amount,
    notes,
    refOrderId: generateOrderRef(),
    dripFeed,
  });
  await order.save({ session });

  await Transaction.create(
    [
      {
        user: userId,
        type: "order_payment",
        amount: -amount,
        balanceBefore,
        balanceAfter: user.balance,
        refId: generateTransactionRef(),
        description: `Order payment for ${service.name}`,
        relatedOrder: order._id,
        status: "completed",
      },
    ],
    { session }
  );

  // Referral commission
  if (user.referredBy) {
    const commission = parseFloat((amount * COMMISSION_RATE).toFixed(4));
    await ReferralLedger.create(
      [
        {
          referrer: user.referredBy,
          referred: userId,
          orderAmount: amount,
          commissionRate: COMMISSION_RATE,
          commissionAmount: commission,
          relatedOrder: order._id,
          status: "pending",
        },
      ],
      { session }
    );
  }

  return order;
}

export async function placeOrder(req: AuthRequest, res: Response) {
  const body = placeOrderSchema.parse(req.body);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const order = await createSingleOrder(
      req.user!.userId,
      body.serviceId,
      body.link,
      body.quantity,
      body.notes,
      body.dripFeed,
      session
    );
    await session.commitTransaction();
    return sendSuccess(res, order, "Order placed successfully", 201);
  } catch (err) {
    await session.abortTransaction();
    return sendError(res, (err as Error).message, 400);
  } finally {
    session.endSession();
  }
}

export async function placeMassOrder(req: AuthRequest, res: Response) {
  const { orders: orderInputs } = massOrderSchema.parse(req.body);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const results = [];
    for (const input of orderInputs) {
      const order = await createSingleOrder(
        req.user!.userId,
        input.serviceId,
        input.link,
        input.quantity,
        input.notes,
        input.dripFeed,
        session
      );
      results.push(order);
    }
    await session.commitTransaction();
    return sendSuccess(res, results, `${results.length} orders placed successfully`, 201);
  } catch (err) {
    await session.abortTransaction();
    return sendError(res, (err as Error).message, 400);
  } finally {
    session.endSession();
  }
}

export async function getOrders(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20", status } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (p - 1) * l;

  const filter: Record<string, unknown> = { user: req.user!.userId };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter).populate("service", "name platform").skip(skip).limit(l).sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, orders, "Orders fetched", 200, paginationMeta(p, l, total));
}

export async function getOrderById(req: AuthRequest, res: Response) {
  const order = await Order.findOne({ _id: req.params["id"], user: req.user!.userId }).populate("service");
  if (!order) return sendError(res, "Order not found", 404);
  return sendSuccess(res, order);
}

export async function cancelOrder(req: AuthRequest, res: Response) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const order = await Order.findOne({ _id: req.params["id"], user: req.user!.userId }).session(session);
    if (!order) { await session.abortTransaction(); return sendError(res, "Order not found", 404); }
    if (!["pending"].includes(order.status)) { await session.abortTransaction(); return sendError(res, "Only pending orders can be canceled", 400); }

    order.status = "canceled";
    order.canceledAt = new Date();
    await order.save({ session });

    // Refund
    const user = await User.findById(req.user!.userId).session(session);
    if (user) {
      const balanceBefore = user.balance;
      user.balance = parseFloat((user.balance + order.amount).toFixed(4));
      await user.save({ session });
      await Transaction.create([{
        user: user._id,
        type: "refund",
        amount: order.amount,
        balanceBefore,
        balanceAfter: user.balance,
        refId: generateTransactionRef(),
        description: `Refund for canceled order ${order.refOrderId}`,
        relatedOrder: order._id,
        status: "completed",
      }], { session });
    }

    await session.commitTransaction();
    return sendSuccess(res, order, "Order canceled and refunded");
  } catch (err) {
    await session.abortTransaction();
    return sendError(res, (err as Error).message, 500);
  } finally {
    session.endSession();
  }
}

// Admin: update order status
export async function adminUpdateOrderStatus(req: AuthRequest, res: Response) {
  const body = updateOrderStatusSchema.parse(req.body);
  const order = await Order.findByIdAndUpdate(req.params["id"], body, { new: true });
  if (!order) return sendError(res, "Order not found", 404);
  return sendSuccess(res, order, "Order status updated");
}

// Admin: list all orders
export async function adminGetOrders(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20", status, userId } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (p - 1) * l;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (userId) filter.user = userId;

  const [orders, total] = await Promise.all([
    Order.find(filter).populate("user", "name email").populate("service", "name").skip(skip).limit(l).sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, orders, "Orders fetched", 200, paginationMeta(p, l, total));
}
