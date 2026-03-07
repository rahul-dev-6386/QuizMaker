import mongoose from "mongoose";
import { Attempt, Quiz, Users } from "../models/index.js";

export async function createQuiz(req, res) {
  const { title, category, questions } = req.body;

  if (!title || !category || !questions || questions.length === 0) {
    return res.status(400).json({
      message: "Title, category and questions are required",
    });
  }

  const normalizedQuestions = questions.map((q) => ({
    question: q?.question,
    options: q?.options,
    correctAnswer: String(q?.correctAnswer),
  }));

  const invalidQuestion = normalizedQuestions.some((q) => {
    if (!q.question || typeof q.question !== "string" || !q.question.trim()) {
      return true;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return true;
    }
    if (q.options.some((opt) => typeof opt !== "string" || !opt.trim())) {
      return true;
    }
    const idx = Number(q.correctAnswer);
    return !Number.isInteger(idx) || idx < 0 || idx > q.options.length - 1;
  });

  if (invalidQuestion) {
    return res.status(400).json({
      message:
        "Each question must include text, exactly 4 non-empty options, and correctAnswer index between 0 and 3",
    });
  }

  try {
    const quiz = await Quiz.create({
      title,
      category,
      questions: normalizedQuestions,
    });

    return res.json({
      message: "Quiz created successfully",
      quiz,
    });
  } catch {
    return res.status(500).json({
      message: "Error creating quiz",
    });
  }
}

export async function adminListQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find({}, { title: 1, category: 1, questions: 1 })
      .sort({ _id: -1 })
      .lean();

    return res.json({
      quizzes: quizzes.map((q) => ({
        id: q._id,
        title: q.title,
        category: q.category,
        questionCount: q.questions?.length || 0,
      })),
    });
  } catch {
    return res.status(500).json({ message: "Error fetching admin quizzes" });
  }
}

export async function adminDeleteQuiz(req, res) {
  const { quizId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    return res.status(400).json({ message: "Invalid quiz id" });
  }

  try {
    const quiz = await Quiz.findByIdAndDelete(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    await Attempt.deleteMany({ quizId });

    return res.json({
      message: "Quiz deleted successfully",
      deletedQuizId: quizId,
    });
  } catch {
    return res.status(500).json({ message: "Error deleting quiz" });
  }
}

export async function adminMergeQuizzes(req, res) {
  const { sourceQuizIds, title, category } = req.body;

  if (!Array.isArray(sourceQuizIds) || sourceQuizIds.length < 2 || !title || !category) {
    return res.status(400).json({
      message: "sourceQuizIds (2+), title and category are required to merge quizzes",
    });
  }

  const invalidId = sourceQuizIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalidId) {
    return res.status(400).json({ message: "Invalid quiz id in sourceQuizIds" });
  }

  try {
    const sourceQuizzes = await Quiz.find({
      _id: { $in: sourceQuizIds },
    }).lean();

    if (sourceQuizzes.length !== sourceQuizIds.length) {
      return res.status(404).json({
        message: "One or more source quizzes not found",
      });
    }

    const seen = new Set();
    const mergedQuestions = [];

    for (const quiz of sourceQuizzes) {
      for (const q of quiz.questions || []) {
        const fingerprint = `${q.question}::${(q.options || []).join("||")}::${q.correctAnswer}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        mergedQuestions.push({
          question: q.question,
          options: q.options,
          correctAnswer: String(q.correctAnswer),
        });
      }
    }

    if (mergedQuestions.length === 0) {
      return res.status(400).json({
        message: "No questions found to merge",
      });
    }

    const mergedQuiz = await Quiz.create({
      title,
      category,
      questions: mergedQuestions,
    });

    return res.json({
      message: "Quizzes merged successfully",
      mergedQuiz: {
        id: mergedQuiz._id,
        title: mergedQuiz.title,
        category: mergedQuiz.category,
        questionCount: mergedQuiz.questions.length,
      },
    });
  } catch {
    return res.status(500).json({ message: "Error merging quizzes" });
  }
}

export async function adminListUsers(req, res) {
  try {
    const users = await Users.aggregate([
      {
        $lookup: {
          from: "attempts",
          localField: "_id",
          foreignField: "userId",
          as: "attempts",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          attemptCount: { $size: "$attempts" },
          bestScore: {
            $ifNull: [{ $max: "$attempts.score" }, 0],
          },
        },
      },
      { $sort: { role: -1, attemptCount: -1, name: 1 } },
    ]);

    return res.json({ users });
  } catch {
    return res.status(500).json({ message: "Error fetching users" });
  }
}
