import type { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { generateReferralCode, generatePasswordResetToken } from "../utils/generateCode.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";
import type { AuthRequest } from "../middleware/auth.js";

export async function register(req: Request, res: Response) {
  const body = registerSchema.parse(req.body);
  const { name, username, email, password, referralCode } = body;

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return sendError(res, "Email or username already taken", 409);

  let referredBy: mongoose.Types.ObjectId | undefined;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (referrer) referredBy = referrer._id as mongoose.Types.ObjectId;
  }

  const user = await User.create({
    name,
    username,
    email,
    password,
    referralCode: generateReferralCode(username),
    referredBy,
  });

  const payload = { userId: (user._id as mongoose.Types.ObjectId).toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return sendSuccess(res, { user: { id: user._id, name, username, email, role: user.role, balance: user.balance, referralCode: user.referralCode }, accessToken, refreshToken }, "Registered successfully", 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select("+password");
  if (!user) return sendError(res, "Invalid credentials", 401);
  if (user.status !== "active") return sendError(res, "Account is suspended or banned", 403);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return sendError(res, "Invalid credentials", 401);

  user.lastLogin = new Date();
  await user.save();

  const payload = { userId: (user._id as mongoose.Types.ObjectId).toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return sendSuccess(res, { user: { id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, balance: user.balance }, accessToken, refreshToken }, "Logged in successfully");
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken: token } = req.body;
  if (!token) return sendError(res, "Refresh token required", 400);

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.userId).select("status role");
    if (!user || user.status !== "active") return sendError(res, "User not found or inactive", 401);

    const newPayload = { userId: payload.userId, role: user.role };
    return sendSuccess(res, {
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
    });
  } catch {
    return sendError(res, "Invalid refresh token", 401);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (!user) return sendSuccess(res, null, "If that email exists, a reset link has been sent");

  const token = generatePasswordResetToken();
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  // In production: send email with token
  return sendSuccess(res, { resetToken: token }, "Password reset token generated");
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select("+password +passwordResetToken +passwordResetExpires");

  if (!user) return sendError(res, "Invalid or expired reset token", 400);

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return sendSuccess(res, null, "Password reset successful");
}

export async function changePassword(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const user = await User.findById(req.user!.userId).select("+password");
  if (!user) return sendError(res, "User not found", 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return sendError(res, "Current password is incorrect", 400);

  user.password = newPassword;
  await user.save();
  return sendSuccess(res, null, "Password changed successfully");
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = await User.findById(req.user!.userId).populate("referredBy", "name username");
  if (!user) return sendError(res, "User not found", 404);
  return sendSuccess(res, user);
}
