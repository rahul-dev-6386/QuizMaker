import { Router } from "express";
import { chatWithBot } from "../controllers/assistantController.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/chatbot/chat", auth, chatWithBot);

export default router;
