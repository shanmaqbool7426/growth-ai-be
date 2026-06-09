import { Router } from "express";
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} from "../../controllers/service.controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

// Public
router.get("/", listServices);
router.get("/:id", getService);

// Admin only
router.post("/", authenticate, authorize("admin"), createService);
router.patch("/:id", authenticate, authorize("admin"), updateService);
router.delete("/:id", authenticate, authorize("admin"), deleteService);

export default router;
