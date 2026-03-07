import axios from "axios";
import { env } from "../config/env.js";

const GEMINI_MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
let geminiModelCache = { models: null, fetchedAt: 0 };

async function getAvailableGeminiModels(apiKey) {
  const now = Date.now();
  if (geminiModelCache.models && now - geminiModelCache.fetchedAt < GEMINI_MODEL_CACHE_TTL_MS) {
    return geminiModelCache.models;
  }

  const preferredOrder = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
  ];

  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    const listedModels = response?.data?.models || [];
    const supported = listedModels
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name?.replace(/^models\//, ""))
      .filter(Boolean);

    if (supported.length > 0) {
      const ranked = supported.sort((a, b) => {
        const ia = preferredOrder.indexOf(a);
        const ib = preferredOrder.indexOf(b);
        const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
        const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
        return ra - rb || a.localeCompare(b);
      });

      geminiModelCache = { models: ranked, fetchedAt: now };
      return ranked;
    }
  } catch (err) {
    console.error("Gemini model discovery error:", err.response?.data || err.message);
  }

  const fallback = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
  ];
  geminiModelCache = { models: fallback, fetchedAt: now };
  return fallback;
}

export async function generateGeminiText(contents) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const models = await getAvailableGeminiModels(env.GEMINI_API_KEY);
  let lastError = null;

  for (const model of models) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
        { contents }
      );

      const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No response from Gemini API");
}
