import cors from "cors";
import express from "express";
import adminRoutes from "./routes/adminRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(authRoutes);
app.use(quizRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);
app.use(assistantRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
