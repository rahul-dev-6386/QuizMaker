import { Router } from "express";
import { getAttempts, getDashboardStats } from "../controllers/dashboardController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard/attempts", auth, getAttempts);
router.get("/dashboard/stats", auth, getDashboardStats);

export default router;
