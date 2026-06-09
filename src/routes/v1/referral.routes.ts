import { Router } from "express";
import {
  getReferralStats,
  getReferralLedger,
  withdrawReferralEarnings,
} from "../../controllers/referral.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/stats", getReferralStats);
router.get("/ledger", getReferralLedger);
router.post("/withdraw", withdrawReferralEarnings);

export default router;
