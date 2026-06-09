import mongoose, { type Document, Schema } from "mongoose";

export interface IService extends Document {
  name: string;
  platform: string;
  category: string;
  pricePerThousand: number;
  minQuantity: number;
  maxQuantity: number;
  avgDeliveryTime: string;
  refillSupport: boolean;
  qualityLabel: string;
  description?: string;
  isActive: boolean;
}

const ServiceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    platform: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    pricePerThousand: { type: Number, required: true, min: 0 },
    minQuantity: { type: Number, required: true, min: 1 },
    maxQuantity: { type: Number, required: true },
    avgDeliveryTime: { type: String, required: true },
    refillSupport: { type: Boolean, default: false },
    qualityLabel: { type: String, default: "Standard" },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServiceSchema.index({ platform: 1, category: 1 });
ServiceSchema.index({ isActive: 1 });

export const Service = mongoose.model<IService>("Service", ServiceSchema);
