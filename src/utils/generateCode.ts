import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";

export function generateReferralCode(username: string): string {
  return (username.toUpperCase().slice(0, 4) + Math.random().toString(36).slice(2, 7).toUpperCase()).slice(0, 8);
}

export function generateTransactionRef(): string {
  return "TXN-" + uuidv4().replace(/-/g, "").toUpperCase().slice(0, 12);
}

export function generateOrderRef(): string {
  return "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function generateApiKey(): string {
  return "ghk_" + crypto.randomBytes(32).toString("hex");
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
