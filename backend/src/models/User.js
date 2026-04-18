import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },
  oauthSubject: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  refreshTokens: {
    type: [String],
    default: [],
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: null },
  badges: { type: [String], default: [] },
  battleWins: { type: Number, default: 0 },
  battleLosses: { type: Number, default: 0 },
  battleDraws: { type: Number, default: 0 },
});

export const Users = mongoose.model("User", UserSchema);
