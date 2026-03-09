import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env"), quiet: true });

if (!process.env.ADMIN_AUTH_KEY) {
  throw new Error("Missing required environment variable: ADMIN_AUTH_KEY");
}

export const env = {
  PORT: Number(process.env.PORT || 3000),
  MONGO_URL: process.env.MONGO_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_SECRET: process.env.ADMIN_SECRET || "admin123",
  ADMIN_AUTH_KEY: process.env.ADMIN_AUTH_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};
