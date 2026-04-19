import express from "express";
import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  resetPassword,
  verifyResetOtp,
  signup
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

export default router;
