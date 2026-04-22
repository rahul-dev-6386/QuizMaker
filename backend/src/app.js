import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import express from "express";
import { env } from "./config/env.js";
import { generateCsrfToken, csrfProtection } from "./middleware/csrf.js";
import adminRoutes from "./routes/adminRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = origin ? origin.replace(/\/+$/, "") : origin;

      if (!normalizedOrigin || env.CLIENT_ORIGINS.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// CSRF token endpoint (optional - for backwards compatibility)
app.get("/csrf-token", (req, res) => {
  const token = generateCsrfToken();
  res.json({ csrfToken: token });
});

// Apply CSRF protection only to quiz submission (user-generated content)
app.use("/quiz/submit", csrfProtection);

app.use(authRoutes);
app.use(quizRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);
app.use(assistantRoutes);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Validation error", details: err.message });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === "production" 
    ? "An error occurred" 
    : err.message || "Internal server error";

  res.status(statusCode).json({ 
    message,
    ...(env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
