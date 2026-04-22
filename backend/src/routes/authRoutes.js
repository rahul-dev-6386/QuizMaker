import { Router } from "express";
import {
  allLogoutHandler,
  adminRequestOtp,
  adminVerifyOtp,
  forgotPasswordHandler,
  getUserInfo,
  logoutHandler,
  refreshHandler,
  resetPasswordHandler,
  signinHandler,
  signupHandler,
  verifyOtpHandler,
} from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";
import { authRateLimit, otpRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.post("/signup", authRateLimit, signupHandler);
router.post("/signup/request-otp", otpRateLimit, signupHandler);
router.post("/signup/verify-otp", authRateLimit, verifyOtpHandler);
router.post("/signin", authRateLimit, signinHandler);
router.post("/auth/refresh", authRateLimit, refreshHandler);
router.post("/auth/logout", logoutHandler);
router.post("/auth/logout-all", auth, allLogoutHandler);
router.get("/auth/me", auth, getUserInfo);
router.post("/forgot-password", otpRateLimit, forgotPasswordHandler);
router.post("/forgot-password/request-otp", otpRateLimit, forgotPasswordHandler);
router.post("/reset-password", authRateLimit, resetPasswordHandler);
router.post("/forgot-password/reset", authRateLimit, resetPasswordHandler);
router.post("/admin/request-otp", auth, otpRateLimit, adminRequestOtp);
router.post("/admin/verify-otp", auth, authRateLimit, adminVerifyOtp);

export default router;
