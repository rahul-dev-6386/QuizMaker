import mongoose from "mongoose";
import { env } from "./env.js";

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDatabase() {
  if (!env.MONGO_URL) {
    throw new Error("MONGO_URL is not configured");
  }

  let retryCount = 0;
  let lastError = null;

  while (retryCount < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGO_URL);
      console.log("MongoDB connected");
      return;
    } catch (err) {
      lastError = err;
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
        console.log(`MongoDB connection attempt ${retryCount} failed. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}
