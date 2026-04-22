import crypto from "crypto";

// Simple in-memory token store (in production, use Redis or similar)
const csrfTokens = new Map();
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function generateCsrfToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = Date.now() + TOKEN_EXPIRY_MS;
  csrfTokens.set(token, expiry);
  return token;
}

export function validateCsrfToken(token) {
  if (!token) return false;
  const expiry = csrfTokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    csrfTokens.delete(token);
    return false;
  }
  // One-time use - delete after validation
  csrfTokens.delete(token);
  return true;
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of csrfTokens.entries()) {
    if (now > expiry) {
      csrfTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export function csrfProtection(req, res, next) {
  // Skip for GET, HEAD, OPTIONS requests (read-only)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const token = req.headers["x-csrf-token"] || req.body?.csrfToken;
  
  if (!validateCsrfToken(token)) {
    return res.status(403).json({ message: "Invalid or missing CSRF token" });
  }

  next();
}
