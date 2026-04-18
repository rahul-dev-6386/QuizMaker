import mongoose from "mongoose";
import { Attempt, Quiz, Users } from "../models/index.js";
import { generateGeminiText } from "../services/geminiService.js";

export async function createQuiz(req, res) {
  const { title, category, questions } = req.body;

  if (!title || !category || !questions || questions.length === 0) {
    return res.status(400).json({
      message: "Title, category and questions are required",
    });
  }

  const normalizedQuestions = questions.map((q) => ({
    question: q?.question ? String(q.question) : "",
    questionImage: q?.questionImage ? String(q.questionImage).trim() : "",
    options: q?.options,
    correctAnswer: String(q?.correctAnswer),
  }));

  const invalidQuestion = normalizedQuestions.some((q) => {
    if (!q.question.trim() && !q.questionImage.trim()) {
      return true;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return true;
    }
    if (q.questionImage && typeof q.questionImage !== "string") {
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
        const imagePart = q.questionImage || "";
        const withImageFingerprint = `${fingerprint}::${imagePart}`;
        if (seen.has(withImageFingerprint)) continue;
        seen.add(withImageFingerprint);
        mergedQuestions.push({
          question: q.question,
          questionImage: q.questionImage || "",
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

export async function generateQuizWithAI(req, res) {
  const { topic, difficulty, questionCount = 10 } = req.body;
  if (!topic) return res.status(400).json({ message: "Topic is required" });

  try {
    const existingQuizzes = await Quiz.find({ category: { $regex: new RegExp(`^${topic}$`, "i") } });
    const existingQuestions = [];
    existingQuizzes.forEach(quiz => {
        if (quiz.questions && Array.isArray(quiz.questions)) {
            quiz.questions.forEach(q => {
                if (q.question) existingQuestions.push(String(q.question).replace(/"/g, "'"));
            });
        }
    });

    let extraInstruction = "";
    if (existingQuestions.length > 0) {
        extraInstruction = `\nCRITICAL: You must generate completely unique questions. Do NOT generate any questions that duplicate or are highly similar to the following previously generated questions:\n${existingQuestions.map(q => "- " + q).join('\n')}\n`;
    }

    const prompt = `
Generate a ${difficulty || 'medium'} difficulty multiple-choice quiz about "${topic}" with ${questionCount} questions.
${extraInstruction}
You must return only a valid JSON array of objects, with no markdown formatting and no extra text.
Each object must have:
- "question": string
- "options": array of exactly 4 strings
- "correctAnswer": string (must be "0", "1", "2", or "3" representing the correct option index)
`;
    const aiResponse = await generateGeminiText([{ role: "user", parts: [{ text: prompt }] }]);
    const jsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(jsonStr);

    const quiz = await Quiz.create({
      title: `${topic} Quiz (AI Generated)`,
      category: topic,
      questions,
      timeLimit: 15,
    });

    return res.json({ message: "AI Quiz generated successfully", quiz });
  } catch (err) {
    return res.status(500).json({ message: "Failed to generate AI quiz", error: err.message });
  }
}

export async function getAnalytics(req, res) {
  try {
    const totalUsers = await Users.countDocuments();
    const totalQuizzes = await Quiz.countDocuments();
    const totalAttempts = await Attempt.countDocuments();
    
    // Aggregate attempts by day for the last 7 days chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const attemptsByDay = await Attempt.aggregate([
      { $match: { submittedAt: { $gte: sevenDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      totalUsers, totalQuizzes, totalAttempts, attemptsByDay
    });
  } catch {
    return res.status(500).json({ message: "Error fetching analytics" });
  }
}
