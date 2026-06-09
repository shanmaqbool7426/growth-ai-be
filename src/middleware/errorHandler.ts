import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  if ((err as NodeJS.ErrnoException).code === "11000") {
    return res.status(409).json({ success: false, message: "Duplicate value — resource already exists" });
  }

  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: process.env["NODE_ENV"] === "production" ? "Internal server error" : err.message,
  });
}
