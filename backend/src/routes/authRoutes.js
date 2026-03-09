import { Router } from "express";
import {
  adminAuthenticate,
  signinHandler,
  signupHandler,
} from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", signupHandler);
router.post("/signin", signinHandler);
router.post("/admin/authenticate", auth, adminAuthenticate);

export default router;
