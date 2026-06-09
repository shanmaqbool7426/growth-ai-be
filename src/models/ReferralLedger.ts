import mongoose, { type Document, Schema } from "mongoose";

export interface IReferralLedger extends Document {
  referrer: mongoose.Types.ObjectId;
  referred: mongoose.Types.ObjectId;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "paid" | "canceled";
  relatedOrder?: mongoose.Types.ObjectId;
  paidAt?: Date;
}

const ReferralLedgerSchema = new Schema<IReferralLedger>(
  {
    referrer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referred: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "canceled"], default: "pending" },
    relatedOrder: { type: Schema.Types.ObjectId, ref: "Order" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

ReferralLedgerSchema.index({ referrer: 1, status: 1 });

export const ReferralLedger = mongoose.model<IReferralLedger>("ReferralLedger", ReferralLedgerSchema);
