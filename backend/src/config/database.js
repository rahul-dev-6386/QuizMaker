import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  if (!env.MONGO_URL) {
    throw new Error("MONGO_URL is not configured");
  }
  await mongoose.connect(env.MONGO_URL);
  console.log("MongoDB connected");
}
