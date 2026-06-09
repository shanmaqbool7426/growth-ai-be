import mongoose, { type Document, Schema } from "mongoose";

export interface IChildPanel extends Document {
  owner: mongoose.Types.ObjectId;
  panelName: string;
  domain?: string;
  apiKey: string;
  markup: number;
  isActive: boolean;
  allowedServices: mongoose.Types.ObjectId[];
  totalOrders: number;
  totalRevenue: number;
}

const ChildPanelSchema = new Schema<IChildPanel>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    panelName: { type: String, required: true, trim: true },
    domain: { type: String, trim: true },
    apiKey: { type: String, required: true },
    markup: { type: Number, default: 20, min: 0, max: 200 },
    isActive: { type: Boolean, default: true },
    allowedServices: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChildPanelSchema.index({ owner: 1 });
ChildPanelSchema.index({ apiKey: 1 });

export const ChildPanel = mongoose.model<IChildPanel>("ChildPanel", ChildPanelSchema);
