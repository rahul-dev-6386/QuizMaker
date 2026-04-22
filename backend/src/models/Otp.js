import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["signup", "password-reset", "admin-access"],
      required: true,
      index: true,
    },
    name: { type: String, default: null },
    password: { type: String, default: null },
    attempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Add TTL index to automatically expire OTP records after 1 hour
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

export const Otp = mongoose.model("Otp", OtpSchema);
