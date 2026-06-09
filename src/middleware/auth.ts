import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { sendError } from "../utils/apiResponse.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return sendError(res, "No token provided", 401);
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token!);
    const user = await User.findById(payload.userId).select("status role");
    if (!user || user.status !== "active") {
      return sendError(res, "Account is not active", 401);
    }
    req.user = { userId: payload.userId, role: payload.role };
    return next();
  } catch {
    return sendError(res, "Invalid or expired token", 401);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, "Access denied", 403);
    }
    return next();
  };
}
