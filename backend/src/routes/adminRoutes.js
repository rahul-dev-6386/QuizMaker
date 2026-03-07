import { Router } from "express";
import {
  adminDeleteQuiz,
  adminListQuizzes,
  adminListUsers,
  adminMergeQuizzes,
  createQuiz,
} from "../controllers/adminController.js";
import { adminOnly, auth } from "../middleware/auth.js";

const router = Router();

router.post("/admin/quiz/create", auth, adminOnly, createQuiz);
router.get("/admin/quizzes", auth, adminOnly, adminListQuizzes);
router.delete("/admin/quiz/:quizId", auth, adminOnly, adminDeleteQuiz);
router.post("/admin/quiz/merge", auth, adminOnly, adminMergeQuizzes);
router.get("/admin/users", auth, adminOnly, adminListUsers);

export default router;
