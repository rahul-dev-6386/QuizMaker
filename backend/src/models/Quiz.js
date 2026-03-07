import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema({
  title: String,
  category: String,
  questions: [
    {
      question: String,
      options: [String],
      correctAnswer: String,
    },
  ],
});

export const Quiz = mongoose.model("Quiz", QuizSchema);
