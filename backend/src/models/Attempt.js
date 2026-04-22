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

// Add indexes for frequently queried fields
AttemptSchema.index({ userId: 1 });
AttemptSchema.index({ quizId: 1 });
AttemptSchema.index({ userId: 1, quizId: 1 });
AttemptSchema.index({ submittedAt: -1 });

export const Attempt = mongoose.model("Attempt", AttemptSchema);
