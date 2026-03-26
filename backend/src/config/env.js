import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env"), quiet: true });

const accessSecret = process.env.ACCESS_SECRET;
const refreshSecret = process.env.REFRESH_SECRET;
const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || "";
const mailAppPassword =
  process.env.MAIL_APP_PASSWORD ||
  process.env.EMAIL_APP_PASSWORD ||
  process.env.SMTP_PASS ||
  "";
const mailFrom = process.env.MAIL_FROM || emailUser || "";

if (!process.env.ADMIN_AUTH_KEY) {
  throw new Error("Missing required environment variable: ADMIN_AUTH_KEY");
}

if (!accessSecret) {
  throw new Error("Missing required environment variable: ACCESS_SECRET");
}

if (!refreshSecret) {
  throw new Error("Missing required environment variable: REFRESH_SECRET");
}

export function getCookieOptions(req) {
  const requestOrigin = req.headers.origin;
  const isCrossOrigin = Boolean(requestOrigin && !clientOrigins.includes(requestOrigin));
  const secure = env.COOKIE_SECURE || Boolean(requestOrigin && requestOrigin.startsWith("https://"));

  return {
    httpOnly: true,
    secure,
    sameSite: secure || isCrossOrigin ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export const env = {
  PORT: Number(process.env.PORT || 3000),
  MONGO_URL: process.env.MONGO_URL,
  ACCESS_SECRET: accessSecret,
  REFRESH_SECRET: refreshSecret,
  ADMIN_SECRET: process.env.ADMIN_SECRET || "admin123",
  ADMIN_AUTH_KEY: process.env.ADMIN_AUTH_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  CLIENT_ORIGIN: clientOrigins[0] || "http://localhost:5173",
  CLIENT_ORIGINS: clientOrigins,
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  OTP_EXPIRES_MINUTES: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  NODE_ENV: process.env.NODE_ENV || "development",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: emailUser,
  SMTP_PASS: mailAppPassword,
  EMAIL_USER: emailUser,
  MAIL_APP_PASSWORD: mailAppPassword,
  MAIL_FROM: mailFrom,
};
