import mongoose from "mongoose";

const BattleMatchSchema = new mongoose.Schema({
  roomId: { type: String, index: true },
  category: { type: String, default: "General", index: true },
  players: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
      name: String,
      score: { type: Number, default: 0 },
      result: {
        type: String,
        enum: ["win", "loss", "draw"],
      },
    },
  ],
  winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  outcome: {
    type: String,
    enum: ["win", "draw", "disconnect"],
    default: "win",
  },
  completedReason: {
    type: String,
    enum: ["finished", "disconnect"],
    default: "finished",
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: Date.now, index: true },
});

export const BattleMatch = mongoose.model("BattleMatch", BattleMatchSchema);
