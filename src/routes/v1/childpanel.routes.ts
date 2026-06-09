import { Router } from "express";
import {
  createChildPanel,
  getChildPanels,
  getChildPanel,
  updateChildPanel,
  regenerateApiKey,
  getPanelServices,
} from "../../controllers/childpanel.controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

// Public — reseller service listing via API key
router.get("/:id/services", getPanelServices);

// Agency + Admin
router.use(authenticate);
router.post("/", authorize("agency", "admin"), createChildPanel);
router.get("/", authorize("agency", "admin"), getChildPanels);
router.get("/:id", authorize("agency", "admin"), getChildPanel);
router.patch("/:id", authorize("agency", "admin"), updateChildPanel);
router.post("/:id/regenerate-key", authorize("agency", "admin"), regenerateApiKey);

export default router;
