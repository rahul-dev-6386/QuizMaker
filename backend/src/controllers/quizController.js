import mongoose from "mongoose";
import { Attempt, Quiz } from "../models/index.js";
import { shuffleArray } from "../utils/shuffle.js";
import { generateGeminiText } from "../services/geminiService.js";

export async function quizGenerator(req, res) {
  const count = parseInt(req.params.count);
  const category = (req.query.category || "").toString().trim();

  if (count <= 0) {
    return res.status(400).json({ message: "Question count must be greater than 0" });
  }

  try {
    const pipeline = [];
    if (category) pipeline.push({ $match: { category } });
    pipeline.push({ $unwind: "$questions" });
    pipeline.push({ $sample: { size: count } });

    const questions = await Quiz.aggregate(pipeline);
    if (questions.length === 0) {
      return res.status(404).json({
        message: category
          ? `No questions available for category "${category}"`
          : "No questions available",
      });
    }

    const formatted = questions.map((q) => ({
      quizId: q._id,
      questionId: q.questions._id,
      question: q.questions.question,
      options: shuffleArray(
        q.questions.options.map((text, originalIndex) => ({
          id: String(originalIndex),
          text,
        }))
      ),
    }));

    return res.json({ totalQuestions: formatted.length, questions: formatted });
  } catch {
    return res.status(500).json({ message: "Error fetching questions" });
  }
}

export async function submitQuiz(req, res) {
  const { answers, quizId, forceRetake } = req.body;

  if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
    return res.status(400).json({ message: "Valid quizId is required" });
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: "Invalid answers format" });
  }

  const invalidAnswer = answers.some(
    (ans) => !ans || typeof ans.questionId !== "string" || typeof ans.answer !== "string"
  );
  if (invalidAnswer) {
    return res.status(400).json({
      message: "Each answer must include questionId and answer as strings",
    });
  }

  try {
    const existingAttempt = await Attempt.findOne({ userId: req.userId, quizId });
    if (existingAttempt && !forceRetake) {
      return res.status(409).json({
        message: "You already attempted this quiz. Submit again if you want to retake it.",
        canRetake: true,
      });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    let score = 0;
    answers.forEach((ans) => {
      const question = quiz.questions.id(ans.questionId);
      if (question && question.correctAnswer === ans.answer) score++;
    });

    const attempt = await Attempt.create({ userId: req.userId, quizId, answers, score });

    return res.json({
      score,
      total: answers.length,
      attemptId: attempt._id,
      message: "Quiz submitted successfully",
    });
  } catch {
    return res.status(500).json({ message: "Error submitting quiz" });
  }
}

export async function getAttemptReport(req, res) {
  const attemptId = req.params.attemptId;

  try {
    const attempt = await Attempt.findById(attemptId).populate("quizId", "title category questions");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Access denied for this attempt" });
    }

    const quiz = attempt.quizId;
    if (!quiz) return res.status(404).json({ message: "Quiz not found for this attempt" });

    const questionMap = new Map(quiz.questions.map((q) => [q._id.toString(), q]));

    const report = (attempt.answers || [])
      .map((attemptAnswer) => {
        const questionDoc = questionMap.get(attemptAnswer.questionId);
        if (!questionDoc) return null;

        const selected = attemptAnswer?.answer ?? "";
        const correct = String(questionDoc.correctAnswer);
        const selectedText = selected !== "" ? questionDoc.options[Number(selected)] : null;
        const correctText = questionDoc.options[Number(correct)];

        return {
          questionId: questionDoc._id.toString(),
          question: questionDoc.question,
          options: questionDoc.options.map((text, idx) => ({ id: String(idx), text })),
          selectedOptionId: selected,
          selectedOptionText: selectedText || "Not answered",
          correctOptionId: correct,
          correctOptionText: correctText,
          isCorrect: selected === correct,
        };
      })
      .filter(Boolean);

    return res.json({
      attemptId: attempt._id,
      quiz: { id: quiz._id, title: quiz.title, category: quiz.category },
      score: attempt.score,
      total: report.length,
      submittedAt: attempt.submittedAt,
      questions: report,
    });
  } catch {
    return res.status(500).json({ message: "Error fetching attempt report" });
  }
}

export async function getLeaderboard(req, res) {
  const quizId = req.params.quizId;

  try {
    const leaderboard = await Attempt.find({ quizId })
      .sort({ score: -1 })
      .limit(10)
      .populate("userId", "name");

    return res.json({ leaderboard });
  } catch {
    return res.status(500).json({ message: "Error fetching leaderboard" });
  }
}

export async function getAllQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find({}, { title: 1, category: 1 }).lean();
    return res.json({
      quizzes: quizzes.map((q) => ({ id: q._id, title: q.title, category: q.category })),
    });
  } catch {
    return res.status(500).json({ message: "Error fetching quizzes" });
  }
}

export async function quizAnalysis(req, res) {
  const attemptId = req.params.attemptId;
  const userQuestion = (req.query.question || "").toString().trim();
  const questionIdFilter = (req.query.questionId || "").toString().trim();

  try {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const quiz = await Quiz.findById(attempt.quizId);

    let wrongQuestions = [];
    let targetQuestion = null;

    attempt.answers.forEach((ans) => {
      const question = quiz.questions.id(ans.questionId);
      if (!question) return;

      const questionEntry = {
        questionId: question._id.toString(),
        question: question.question,
        correctAnswer: question.options[question.correctAnswer],
        userAnswer: ans.answer !== "" ? question.options[ans.answer] : "Not answered",
        isCorrect: question.correctAnswer === ans.answer,
      };

      if (questionIdFilter && questionEntry.questionId === questionIdFilter) {
        targetQuestion = questionEntry;
      }

      if (!questionEntry.isCorrect) wrongQuestions.push(questionEntry);
    });

    if (questionIdFilter && !targetQuestion) {
      return res.status(404).json({ message: "Question not found in this attempt" });
    }

    if (!questionIdFilter && wrongQuestions.length === 0) {
      return res.json({
        wrongQuestions: [],
        explanation: "Great work. You did not miss any questions in this attempt.",
      });
    }

    const focusPrompt = questionIdFilter
      ? `
You are a concise quiz coach.
Analyze ONLY this single question.
Return in this structure:

Question Summary:
- 1 short line

What Went Wrong:
- Why this answer is incorrect or how to validate if correct

Concept Fix:
- key concept in 2 lines

Memory Tip:
- 1 short tip

Keep total response under 120 words.

Question data:
${JSON.stringify(targetQuestion)}

User focus:
${userQuestion || "Explain this specific question only."}
`
      : `
You are a concise quiz coach.
Return output in this exact structure:

Summary:
- short 1-2 lines

Mistakes:
- Question: ...
  Why wrong: ...
  Key concept: ...
  Correct approach: ...

Action Plan:
- 3 practical bullet points

Keep total response under 180 words.

Student wrong questions:
${JSON.stringify(wrongQuestions)}

Student focus question:
${userQuestion || "Give a general improvement analysis for this attempt."}
`;

    const explanation = await generateGeminiText([{ role: "user", parts: [{ text: focusPrompt }] }]);

    return res.json({
      wrongQuestions: questionIdFilter ? [targetQuestion] : wrongQuestions,
      explanation,
    });
  } catch {
    return res.status(500).json({ message: "Error generating analysis" });
  }
}
