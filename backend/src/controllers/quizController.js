import mongoose from "mongoose";
import { Attempt, Quiz } from "../models/index.js";
import { shuffleArray } from "../utils/shuffle.js";
import { generateGeminiText } from "../services/geminiService.js";

export async function quizGenerator(req, res) {
  const count = parseInt(req.params.count);
  const category = (req.query.category || "").toString().trim();
  const quizId = (req.query.quizId || "").toString().trim();

  if (count <= 0) {
    return res.status(400).json({ message: "Question count must be greater than 0" });
  }

  try {
    const basePipeline = [];
    if (quizId && mongoose.Types.ObjectId.isValid(quizId)) {
      basePipeline.push({ $match: { _id: new mongoose.Types.ObjectId(quizId) } });
    } else if (category) {
      basePipeline.push({ $match: { category } });
    }
    basePipeline.push({ $unwind: "$questions" });

    const available = await Quiz.aggregate([...basePipeline, { $count: "total" }]);
    const availableCount = available?.[0]?.total || 0;

    if (availableCount === 0) {
      return res.status(404).json({
        message: category
          ? `No questions available for category "${category}"`
          : "No questions available",
      });
    }

    if (availableCount < count) {
      return res.status(409).json({
        code: "INSUFFICIENT_QUESTIONS",
        requestedCount: count,
        availableCount,
        message: `Only ${availableCount} question(s) available${category ? ` for "${category}"` : ""}. Please choose ${availableCount} or fewer.`,
      });
    }

    const questions = await Quiz.aggregate([...basePipeline, { $sample: { size: count } }]);

    const formatted = questions.map((q) => ({
      quizId: q._id,
      questionId: q.questions._id,
      question: q.questions.question,
      questionImage: q.questions.questionImage || "",
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
  const { answers, quizId, attemptMode, displayTitle, topicLabel } = req.body;

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
    const questionIds = answers
      .map((ans) => ans.questionId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const quizzes = await Quiz.find({ "questions._id": { $in: questionIds } });
    if (!quizzes.length) return res.status(404).json({ message: "Quiz questions not found" });

    const questionMap = new Map();
    quizzes.forEach((qz) => {
      qz.questions.forEach((q) => {
        questionMap.set(q._id.toString(), q);
      });
    });

    let score = 0;
    answers.forEach((ans) => {
      const question = questionMap.get(ans.questionId);
      if (question && question.correctAnswer === ans.answer) score++;
    });

    const normalizedMode = attemptMode === "random" ? "random" : "quiz";
    const normalizedDisplayTitle =
      normalizedMode === "random"
        ? String(displayTitle || "Random Quiz").trim()
        : String(displayTitle || "").trim();
    const normalizedTopicLabel =
      normalizedMode === "random"
        ? String(topicLabel || "Random").trim()
        : String(topicLabel || "").trim();

    const attempt = await Attempt.create({
      userId: req.userId,
      quizId,
      attemptMode: normalizedMode,
      displayTitle: normalizedDisplayTitle,
      topicLabel: normalizedTopicLabel,
      answers,
      score,
    });

    return res.json({
      score,
      total: answers.length,
      attemptId: attempt._id,
      attemptMode: attempt.attemptMode,
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

    const attemptedQuestionIds = (attempt.answers || [])
      .map((a) => a.questionId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const quizzes = await Quiz.find({ "questions._id": { $in: attemptedQuestionIds } });
    const questionMap = new Map();
    quizzes.forEach((qz) => {
      qz.questions.forEach((q) => {
        questionMap.set(q._id.toString(), q);
      });
    });

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
          questionImage: questionDoc.questionImage || "",
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
      attemptMode: attempt.attemptMode || "quiz",
      displayTitle:
        attempt.displayTitle || attempt.quizId?.title || "Quiz",
      topicLabel:
        attempt.topicLabel || attempt.quizId?.category || "General",
      quiz: attempt.quizId
        ? {
            id: attempt.quizId._id,
            title: attempt.quizId.title,
            category: attempt.quizId.category,
          }
        : null,
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

    const attemptedQuestionIds = (attempt.answers || [])
      .map((a) => a.questionId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const quizzes = await Quiz.find({ "questions._id": { $in: attemptedQuestionIds } });
    const questionMap = new Map();
    quizzes.forEach((qz) => {
      qz.questions.forEach((q) => {
        questionMap.set(q._id.toString(), q);
      });
    });

    let wrongQuestions = [];
    let targetQuestion = null;

    attempt.answers.forEach((ans) => {
      const question = questionMap.get(ans.questionId);
      if (!question) return;

      const questionEntry = {
        questionId: question._id.toString(),
        question: question.question,
        questionImage: question.questionImage || "",
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
