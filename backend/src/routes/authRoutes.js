import { Router } from "express";
import {
  adminAuthenticate,
  resendOtpHandler,
  signinHandler,
  signupHandler,
  verifyOtpHandler,
} from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", signupHandler);
router.post("/signin", signinHandler);
router.post("/verify-otp", verifyOtpHandler);
router.post("/resend-otp", resendOtpHandler);
router.post("/admin/authenticate", auth, adminAuthenticate);

export default router;
