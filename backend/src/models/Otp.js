import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["signup", "password-reset"],
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

export const Otp = mongoose.model("Otp", OtpSchema);
