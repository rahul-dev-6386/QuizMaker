import { Attempt, Quiz } from "../models/index.js";

export async function chatWithBot(req, res) {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    const user = await Users.findById(req.userId);
    const totalQuizzes = await Quiz.countDocuments();
    const attempts = await Attempt.find({ userId: req.userId }).populate("quizId", "title category");
    
    const totalAttemptedQuestions = attempts.reduce((acc, a) => acc + (a.answers?.length || 0), 0);
    const totalCorrect = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const accuracyPercent = totalAttemptedQuestions ? Math.round((totalCorrect / totalAttemptedQuestions) * 100) : 0;
    const bestScore = Math.max(...attempts.map((a) => a.score), 0);
    const totalAttempts = attempts.length;

    let lastAttemptText = "No attempts yet.";
    if (attempts.length > 0) {
        const sorted = [...attempts].sort((a,b) => b.submittedAt - a.submittedAt);
        const lastAttempt = sorted[0];
        const total = lastAttempt.answers?.length || 0;
        const pct = total ? Math.round((lastAttempt.score / total) * 100) : 0;
        lastAttemptText = `Quiz: ${lastAttempt.quizId?.title || 'Unknown'} | Score: ${lastAttempt.score}/${total} (${pct}%)`;
    }

    const systemPrompt = `
You are "Sharthi", a polite, encouraging, and highly intelligent AI assistant built exclusively for QuizMaster platform learners.
You help students analyze their performance, understand their statistics, and navigate the platform.

Here is the LIVE context data for the user currently talking to you:
- User Name: ${user ? user.name : "Student"}
- Platform Total Available Quizzes: ${totalQuizzes}
- User Total Attempted Quizzes: ${totalAttempts}
- User Total Answered Questions: ${totalAttemptedQuestions}
- User Overall Accuracy: ${accuracyPercent}%
- User Best Score: ${bestScore}
- User Latest Quiz Scorecard: ${lastAttemptText}

Instructions:
1. Always base your answers regarding their performance strictly on the LIVE context data provided above.
2. Keep your answers relatively concise, warm, and highly readable.
3. If they ask about unsupported topics outside of quizzes or learning, creatively guide them back to their statistics or recommend they take another quiz.
`;

    // Map history to Gemini format (user vs model)
    const formattedHistory = [];
    formattedHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
    formattedHistory.push({ role: "model", parts: [{ text: "Understood. I am Sharthi, ready to assist." }] });

    if (Array.isArray(history)) {
        history.forEach(m => {
            if (m.role === 'user' || m.role === 'bot') {
                formattedHistory.push({ 
                    role: m.role === 'bot' ? 'model' : 'user', 
                    parts: [{ text: m.text }] 
                });
            }
        });
    }

    formattedHistory.push({ role: 'user', parts: [{ text: message }] });

    const aiResponse = await generateGeminiText(formattedHistory);

    return res.json({ reply: aiResponse });

  } catch (err) {
    console.error("Chatbot error:", err.message);
    return res.status(500).json({ message: "Failed to generate response" });
  }
}
