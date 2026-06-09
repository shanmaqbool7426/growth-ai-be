export const ROLES = {
  USER: "user",
  AGENCY: "agency",
  ADMIN: "admin",
} as const;

export const ORDER_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  PARTIAL: "partial",
  CANCELED: "canceled",
  FAILED: "failed",
} as const;

export const TRANSACTION_TYPES = {
  DEPOSIT: "deposit",
  ORDER_PAYMENT: "order_payment",
  REFUND: "refund",
  WITHDRAWAL: "withdrawal",
  REFERRAL_EARNING: "referral_earning",
} as const;

export const TICKET_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

export const TICKET_CATEGORIES = {
  REFILL: "refill",
  REFUND: "refund",
  SPEED_UP: "speed_up",
  WRONG_LINK: "wrong_link",
  OTHER: "other",
} as const;

export const JWT_ACCESS_EXPIRES = "15m";
export const JWT_REFRESH_EXPIRES = "7d";
export const BCRYPT_ROUNDS = 12;
export const MAX_LOGIN_ATTEMPTS = 5;
