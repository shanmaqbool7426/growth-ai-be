import { Router } from "express";
import authRoutes from "./auth.routes.js";
import serviceRoutes from "./service.routes.js";
import orderRoutes from "./order.routes.js";
import walletRoutes from "./wallet.routes.js";
import ticketRoutes from "./ticket.routes.js";
import referralRoutes from "./referral.routes.js";
import childpanelRoutes from "./childpanel.routes.js";
import adminRoutes from "./admin.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/services", serviceRoutes);
router.use("/orders", orderRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/wallet", walletRoutes);
router.use("/tickets", ticketRoutes);
router.use("/referrals", referralRoutes);
router.use("/panels", childpanelRoutes);
router.use("/admin", adminRoutes);

export default router;
