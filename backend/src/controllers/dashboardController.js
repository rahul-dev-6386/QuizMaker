import { Attempt } from "../models/index.js";

export async function getAttempts(req, res) {
  const attempts = await Attempt.find({ userId: req.userId })
    .populate("quizId", "title category")
    .sort({ submittedAt: -1 });

  res.json({ attempts });
}

export async function getDashboardStats(req, res) {
  try {
    const attempts = await Attempt.find({ userId: req.userId });

    const totalQuizzes = attempts.length;
    const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
    const bestScore = Math.max(...attempts.map((a) => a.score), 0);
    const averageScore = totalQuizzes ? totalScore / totalQuizzes : 0;
    const totalQuestionsAttempted = attempts.reduce(
      (acc, a) => acc + (a.answers?.length || 0),
      0
    );
    const accuracyPercent = totalQuestionsAttempted
      ? (totalScore / totalQuestionsAttempted) * 100
      : 0;

    res.json({
      totalQuizzes,
      bestScore,
      averageScore,
      totalQuestionsAttempted,
      accuracyPercent,
    });
  } catch {
    res.status(500).json({ message: "Error generating dashboard stats" });
  }
}
