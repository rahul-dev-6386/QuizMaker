import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { Users } from "../models/index.js";

export async function signupHandler(req, res) {
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(3),
    password: z
      .string()
      .min(6)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
        "Password must contain uppercase, lowercase, number and special character"
      ),
    adminSecret: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
  }

  const { email, password, name, adminSecret } = req.body;
  const role =
    adminSecret && (adminSecret === env.ADMIN_SECRET || adminSecret === env.ADMIN_AUTH_KEY)
      ? "admin"
      : "user";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await Users.create({ email, password: hashedPassword, name, role });
    return res.json({ message: "User signed up successfully" });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(403).json({ message: "User already exists" });
    }
    return res.status(500).json({ message: "Error creating user" });
  }
}

export async function signinHandler(req, res) {
  const schema = z.object({
    email: z.string(),
    password: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const { email, password } = req.body;
  try {
    const user = await Users.findOne({ email });
    if (!user) return res.status(403).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      token,
      message: "Signin successful",
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      },
    });
  } catch {
    return res.status(500).json({ message: "Signin error" });
  }
}

export async function adminAuthenticate(req, res) {
  const { key } = req.body;

  if (!key || (key !== env.ADMIN_AUTH_KEY && key !== env.ADMIN_SECRET)) {
    return res.status(403).json({ message: "Invalid admin key" });
  }

  try {
    const user = await Users.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "admin";
    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Successfully upgraded to admin",
      token,
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      },
    });
  } catch {
    return res.status(500).json({ message: "Error authenticating admin" });
  }
}
