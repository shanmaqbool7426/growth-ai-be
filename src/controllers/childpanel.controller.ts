import type { Response } from "express";
import { ChildPanel } from "../models/ChildPanel.js";
import { Service } from "../models/Service.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { generateApiKey } from "../utils/generateCode.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createPanelSchema = z.object({
  panelName: z.string().min(2).max(100),
  domain: z.string().url().optional(),
  markup: z.number().min(0).max(200).optional(),
});

const updatePanelSchema = createPanelSchema.partial();

export async function createChildPanel(req: AuthRequest, res: Response) {
  const body = createPanelSchema.parse(req.body);
  const existingCount = await ChildPanel.countDocuments({ owner: req.user!.userId });
  if (existingCount >= 5) return sendError(res, "Maximum 5 child panels allowed per account", 400);

  const panel = await ChildPanel.create({ ...body, owner: req.user!.userId, apiKey: generateApiKey() });
  return sendSuccess(res, panel, "Child panel created", 201);
}

export async function getChildPanels(req: AuthRequest, res: Response) {
  const filter = req.user!.role === "admin" ? {} : { owner: req.user!.userId };
  const panels = await ChildPanel.find(filter).populate("owner", "name email").sort({ createdAt: -1 });
  return sendSuccess(res, panels);
}

export async function getChildPanel(req: AuthRequest, res: Response) {
  const filter: Record<string, unknown> = { _id: req.params["id"] };
  if (req.user!.role !== "admin") filter.owner = req.user!.userId;

  const panel = await ChildPanel.findOne(filter).populate("allowedServices");
  if (!panel) return sendError(res, "Panel not found", 404);
  return sendSuccess(res, panel);
}

export async function updateChildPanel(req: AuthRequest, res: Response) {
  const body = updatePanelSchema.parse(req.body);
  const filter: Record<string, unknown> = { _id: req.params["id"] };
  if (req.user!.role !== "admin") filter.owner = req.user!.userId;

  const panel = await ChildPanel.findOneAndUpdate(filter, body, { new: true });
  if (!panel) return sendError(res, "Panel not found", 404);
  return sendSuccess(res, panel, "Panel updated");
}

export async function regenerateApiKey(req: AuthRequest, res: Response) {
  const filter: Record<string, unknown> = { _id: req.params["id"] };
  if (req.user!.role !== "admin") filter.owner = req.user!.userId;

  const panel = await ChildPanel.findOneAndUpdate(filter, { apiKey: generateApiKey() }, { new: true });
  if (!panel) return sendError(res, "Panel not found", 404);
  return sendSuccess(res, { apiKey: panel.apiKey }, "API key regenerated");
}

export async function getPanelServices(req: AuthRequest, res: Response) {
  const panel = await ChildPanel.findOne({ _id: req.params["id"] });
  if (!panel || !panel.isActive) return sendError(res, "Panel not found or inactive", 404);

  const services = await Service.find({ isActive: true }).select("-__v");
  const servicesWithMarkup = services.map((s) => ({
    ...s.toObject(),
    pricePerThousand: parseFloat((s.pricePerThousand * (1 + panel.markup / 100)).toFixed(4)),
  }));

  return sendSuccess(res, servicesWithMarkup);
}
