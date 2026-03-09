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
  isVerified: { type: Boolean, default: true },
  otpCodeHash: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
});

export const Users = mongoose.model("User", UserSchema);
