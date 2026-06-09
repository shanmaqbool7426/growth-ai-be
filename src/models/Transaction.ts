import mongoose, { type Document, Schema } from "mongoose";
import { TRANSACTION_TYPES } from "../constants/index.js";

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  refId: string;
  description: string;
  relatedOrder?: mongoose.Types.ObjectId;
  status: "pending" | "completed" | "failed";
  meta?: Record<string, unknown>;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(TRANSACTION_TYPES), required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    refId: { type: String, unique: true, required: true },
    description: { type: String, required: true },
    relatedOrder: { type: Schema.Types.ObjectId, ref: "Order" },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ type: 1 });

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);
