import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("accessToken="))
    ?.split("=")[1];
  const accessToken =
    (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
    cookieToken;

  if (!accessToken) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(accessToken, env.ACCESS_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: "Token expired or invalid" });
  }
}

export function adminOnly(req, res, next) {
  if (req.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
