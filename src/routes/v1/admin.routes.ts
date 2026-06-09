import { Router } from "express";
import {
  getStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAdminTransactions,
} from "../../controllers/admin.controller.js";
import { adminGetOrders, adminUpdateOrderStatus } from "../../controllers/order.controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/stats", getStats);

// Users
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Orders
router.get("/orders", adminGetOrders);
router.patch("/orders/:id/status", adminUpdateOrderStatus);

// Transactions
router.get("/transactions", getAdminTransactions);

export default router;
