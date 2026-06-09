import { Router } from "express";
import {
  placeOrder,
  placeMassOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  adminUpdateOrderStatus,
  adminGetOrders,
} from "../../controllers/order.controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", placeOrder);
router.post("/mass", placeMassOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch("/:id/cancel", cancelOrder);

// Admin
router.get("/admin/all", authorize("admin"), adminGetOrders);
router.patch("/admin/:id/status", authorize("admin"), adminUpdateOrderStatus);

export default router;
