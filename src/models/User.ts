import mongoose, { type Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, BCRYPT_ROUNDS } from "../constants/index.js";

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "user" | "agency" | "admin";
  avatar?: string;
  balance: number;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  status: "active" | "suspended" | "banned";
  lastLogin?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    avatar: { type: String },
    balance: { type: Number, default: 0, min: 0 },
    referralCode: { type: String, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
    lastLogin: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
