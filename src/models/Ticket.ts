import mongoose, { type Document, Schema } from "mongoose";
import { TICKET_STATUS, TICKET_CATEGORIES } from "../constants/index.js";

export interface ITicket extends Document {
  user: mongoose.Types.ObjectId;
  subject: string;
  category: string;
  status: string;
  relatedOrder?: mongoose.Types.ObjectId;
  priority: "low" | "medium" | "high";
  closedAt?: Date;
}

export interface ITicketReply extends Document {
  ticket: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderRole: "user" | "admin";
  message: string;
  attachments?: string[];
}

const TicketSchema = new Schema<ITicket>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: Object.values(TICKET_CATEGORIES), required: true },
    status: { type: String, enum: Object.values(TICKET_STATUS), default: TICKET_STATUS.OPEN },
    relatedOrder: { type: Schema.Types.ObjectId, ref: "Order" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

const TicketReplySchema = new Schema<ITicketReply>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["user", "admin"], required: true },
    message: { type: String, required: true },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

TicketSchema.index({ user: 1, status: 1 });
TicketReplySchema.index({ ticket: 1 });

export const Ticket = mongoose.model<ITicket>("Ticket", TicketSchema);
export const TicketReply = mongoose.model<ITicketReply>("TicketReply", TicketReplySchema);
