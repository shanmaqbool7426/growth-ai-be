import type { Request, Response } from "express";
import { Service } from "../models/Service.js";
import { sendSuccess, sendError, paginationMeta } from "../utils/apiResponse.js";
import { createServiceSchema, updateServiceSchema } from "../validators/service.validator.js";

export async function listServices(req: Request, res: Response) {
  const { page = "1", limit = "20", platform, category, search, active } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (p - 1) * l;

  const filter: Record<string, unknown> = {};
  if (active !== "false") filter.isActive = true;
  if (platform) filter.platform = new RegExp(platform, "i");
  if (category) filter.category = new RegExp(category, "i");
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { description: new RegExp(search, "i") }];

  const [services, total] = await Promise.all([
    Service.find(filter).select("-__v").skip(skip).limit(l).sort({ createdAt: -1 }),
    Service.countDocuments(filter),
  ]);

  return sendSuccess(res, services, "Services fetched", 200, paginationMeta(p, l, total));
}

export async function getService(req: Request, res: Response) {
  const service = await Service.findById(req.params["id"]);
  if (!service) return sendError(res, "Service not found", 404);
  return sendSuccess(res, service);
}

export async function createService(req: Request, res: Response) {
  const body = createServiceSchema.parse(req.body);
  const service = await Service.create(body);
  return sendSuccess(res, service, "Service created", 201);
}

export async function updateService(req: Request, res: Response) {
  const body = updateServiceSchema.parse(req.body);
  const service = await Service.findByIdAndUpdate(req.params["id"], body, { new: true, runValidators: true });
  if (!service) return sendError(res, "Service not found", 404);
  return sendSuccess(res, service, "Service updated");
}

export async function deleteService(req: Request, res: Response) {
  const service = await Service.findByIdAndDelete(req.params["id"]);
  if (!service) return sendError(res, "Service not found", 404);
  return sendSuccess(res, null, "Service deleted");
}
