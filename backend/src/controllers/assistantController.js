import { Attempt, Quiz } from "../models/index.js";

export async function chatWithBot(req, res) {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    const q = message.toLowerCase().trim();

    const quizCountIntent = q.includes("how many") && q.includes("quiz");
    const lastScoreIntent =
      q.includes("last quiz") || q.includes("last score") || q.includes("scorecard");
    const attemptedQuestionsIntent =
      q.includes("total attempted question") || q.includes("attempted questions");
    const accuracyIntent = q.includes("accuracy");
    const bestScoreIntent = q.includes("best score");
    const totalAttemptsIntent = q.includes("total attempt") || q.includes("how many attempts");
    const helpIntent = q.includes("help") || q.includes("options") || q.includes("what can you do");

    if (quizCountIntent) {
      const totalQuizzes = await Quiz.countDocuments();
      return res.json({ reply: `There are ${totalQuizzes} quizzes available.` });
    }

    if (lastScoreIntent) {
      const lastAttempt = await Attempt.findOne({ userId: req.userId })
        .sort({ submittedAt: -1 })
        .populate("quizId", "title category");

      if (!lastAttempt) {
        return res.json({ reply: "No attempts found yet. Start a quiz first." });
      }

      const total = lastAttempt.answers?.length || 0;
      const pct = total ? Math.round((lastAttempt.score / total) * 100) : 0;
      const when = new Date(lastAttempt.submittedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return res.json({
        reply:
          `Latest Scorecard:\n` +
          `Quiz: ${lastAttempt.quizId?.title || "Quiz"} (${lastAttempt.quizId?.category || "General"})\n` +
          `Score: ${lastAttempt.score}/${total}\n` +
          `Accuracy: ${pct}%\n` +
          `Attempted on: ${when}`,
      });
    }

    if (attemptedQuestionsIntent || accuracyIntent || bestScoreIntent || totalAttemptsIntent) {
      const attempts = await Attempt.find({ userId: req.userId });
      const totalAttemptedQuestions = attempts.reduce((acc, a) => acc + (a.answers?.length || 0), 0);
      const totalCorrect = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
      const accuracyPercent = totalAttemptedQuestions
        ? Math.round((totalCorrect / totalAttemptedQuestions) * 100)
        : 0;
      const bestScore = Math.max(...attempts.map((a) => a.score), 0);
      const totalAttempts = attempts.length;

      return res.json({
        reply:
          `Your Attempt Stats:\n` +
          `Total attempts: ${totalAttempts}\n` +
          `Total attempted questions: ${totalAttemptedQuestions}\n` +
          `Total correct answers: ${totalCorrect}\n` +
          `Accuracy: ${accuracyPercent}%\n` +
          `Best score in one attempt: ${bestScore}`,
      });
    }

    if (helpIntent) {
      return res.json({
        reply:
          "I can help with these platform tasks:\n" +
          "1. how many quizzes are there\n" +
          "2. my last scorecard\n" +
          "3. total attempted questions\n" +
          "4. my accuracy\n" +
          "5. my best score\n" +
          "6. total attempts",
      });
    }

    return res.json({
      reply:
        "I can help with platform tasks only. Try: how many quizzes are there, my last scorecard, total attempted questions, my accuracy, my best score, total attempts.",
    });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    return res.status(500).json({ message: "Assistant failed to process request" });
  }
}
