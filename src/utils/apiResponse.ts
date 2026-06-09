import type { Response } from "express";

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export function sendSuccess(
  res: Response,
  data: unknown = null,
  message = "Success",
  statusCode = 200,
  meta?: Meta
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : undefined),
  });
}

export function sendError(
  res: Response,
  message = "Something went wrong",
  statusCode = 500,
  errors?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : undefined),
  });
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
