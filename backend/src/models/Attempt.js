import mongoose from "mongoose";

const AttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  attemptMode: {
    type: String,
    enum: ["quiz", "random"],
    default: "quiz",
  },
  displayTitle: {
    type: String,
    default: "",
    trim: true,
  },
  topicLabel: {
    type: String,
    default: "",
    trim: true,
  },
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
