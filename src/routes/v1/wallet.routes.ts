import { Router } from "express";
import {
  getWallet,
  addFunds,
  getTransactions,
  adminAdjustBalance,
} from "../../controllers/wallet.controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getWallet);
router.post("/add-funds", addFunds);
router.get("/transactions", getTransactions);

// Admin
router.post("/admin/adjust", authorize("admin"), adminAdjustBalance);

export default router;
