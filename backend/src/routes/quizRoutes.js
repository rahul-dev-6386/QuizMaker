import { Router } from "express";
import {
  getAllQuizzes,
  getAttemptReport,
  getLeaderboard,
  quizAnalysis,
  quizGenerator,
  submitQuiz,
} from "../controllers/quizController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/quizzes", auth, getAllQuizzes);
router.get("/quiz/random/:count", auth, quizGenerator);
router.post("/quiz/submit", auth, submitQuiz);
router.get("/quiz/leaderboard/:quizId", auth, getLeaderboard);
router.get("/quiz/analysis/:attemptId", auth, quizAnalysis);
router.get("/quiz/report/:attemptId", auth, getAttemptReport);

export default router;
