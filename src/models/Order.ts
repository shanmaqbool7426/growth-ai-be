import mongoose, { type Document, Schema } from "mongoose";
import { ORDER_STATUS } from "../constants/index.js";

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  serviceSnapshot: {
    name: string;
    platform: string;
    category: string;
    pricePerThousand: number;
  };
  link: string;
  quantity: number;
  amount: number;
  status: (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
  startCount?: number;
  remains?: number;
  notes?: string;
  refOrderId?: string;
  dripFeed?: {
    enabled: boolean;
    interval: number;
    runs: number;
  };
  canceledAt?: Date;
  completedAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    serviceSnapshot: {
      name: { type: String, required: true },
      platform: { type: String, required: true },
      category: { type: String, required: true },
      pricePerThousand: { type: Number, required: true },
    },
    link: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    startCount: { type: Number },
    remains: { type: Number },
    notes: { type: String },
    refOrderId: { type: String },
    dripFeed: {
      enabled: { type: Boolean, default: false },
      interval: { type: Number },
      runs: { type: Number },
    },
    canceledAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

OrderSchema.index({ user: 1, status: 1 });
OrderSchema.index({ status: 1 });

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
