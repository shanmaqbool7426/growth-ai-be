import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} from "../../controllers/auth.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.patch("/change-password", authenticate, changePassword);
router.get("/me", authenticate, getMe);

export default router;
