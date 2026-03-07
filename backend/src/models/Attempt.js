import mongoose from "mongoose";

const AttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  answers: [
    {
      questionId: String,
      answer: String,
    },
  ],
  score: Number,
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Attempt = mongoose.model("Attempt", AttemptSchema);
