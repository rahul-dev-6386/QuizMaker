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

const router = Router();

router.post("/signup", signupHandler);
router.post("/signup/request-otp", signupHandler);
router.post("/signup/verify-otp", verifyOtpHandler);
router.post("/signin", signinHandler);
router.post("/auth/refresh", refreshHandler);
router.post("/auth/logout", logoutHandler);
router.post("/auth/logout-all", auth, allLogoutHandler);
router.get("/auth/me", auth, getUserInfo);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/forgot-password/request-otp", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);
router.post("/forgot-password/reset", resetPasswordHandler);
router.post("/admin/request-otp", auth, adminRequestOtp);
router.post("/admin/verify-otp", auth, adminVerifyOtp);

export default router;
