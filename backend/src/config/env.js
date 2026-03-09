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
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),
  MONGO_URL: process.env.MONGO_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_SECRET: process.env.ADMIN_SECRET || "admin123",
  ADMIN_AUTH_KEY: process.env.ADMIN_AUTH_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES || 10),
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM,
};
