import { Router } from "express";
import {
  adminDeleteQuiz,
  adminListQuizzes,
  adminListUsers,
  adminMergeQuizzes,
  createQuiz,
  generateQuizWithAI,
  getAnalytics,
} from "../controllers/adminController.js";
import { adminOnly, auth } from "../middleware/auth.js";

const router = Router();

router.post("/admin/quiz/create", auth, adminOnly, createQuiz);
router.post("/admin/quiz/generate", auth, adminOnly, generateQuizWithAI);
router.get("/admin/quizzes", auth, adminOnly, adminListQuizzes);
router.delete("/admin/quiz/:quizId", auth, adminOnly, adminDeleteQuiz);
router.post("/admin/quiz/merge", auth, adminOnly, adminMergeQuizzes);
router.get("/admin/users", auth, adminOnly, adminListUsers);
router.get("/admin/analytics", auth, adminOnly, getAnalytics);

export default router;
