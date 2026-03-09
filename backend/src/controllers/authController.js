import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { Users } from "../models/index.js";
import { sendOtpMail } from "../services/emailService.js";

function issueAuthPayload(user) {
  const token = jwt.sign({ id: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    },
  };
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

async function setAndSendVerificationOtp(user) {
  const otp = generateOtpCode();
  user.otpCodeHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
  await user.save();

  const mailResult = await sendOtpMail({
    to: user.email,
    name: user.name,
    otp,
  });

  return {
    ...mailResult,
    debugOtp: env.NODE_ENV === "production" ? undefined : otp,
  };
}

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
    const existingUser = await Users.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(403).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user = existingUser;
    if (!user) {
      user = await Users.create({
        email,
        password: hashedPassword,
        name,
        role,
        authProvider: "local",
        isVerified: false,
      });
    } else {
      user.name = name;
      user.password = hashedPassword;
      user.role = role;
      user.authProvider = "local";
      user.isVerified = false;
    }

    const mailMeta = await setAndSendVerificationOtp(user);

    return res.json({
      message: "Signup successful. Please verify your email with OTP.",
      requiresVerification: true,
      email,
      ...(mailMeta.debugOtp ? { debugOtp: mailMeta.debugOtp } : {}),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Error creating user" });
  }
}

export async function verifyOtpHandler(req, res) {
  const schema = z.object({
    email: z.string().email(),
    otp: z.string().regex(/^\d{6}$/),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const { email, otp } = req.body;

  try {
    const user = await Users.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
      const auth = issueAuthPayload(user);
      return res.json({ message: "Email already verified", ...auth });
    }

    if (!user.otpCodeHash || !user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    if (hashOtp(otp) !== user.otpCodeHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otpCodeHash = null;
    user.otpExpiresAt = null;
    await user.save();

    const auth = issueAuthPayload(user);
    return res.json({ message: "Email verified successfully", ...auth });
  } catch {
    return res.status(500).json({ message: "OTP verification failed" });
  }
}

export async function resendOtpHandler(req, res) {
  const schema = z.object({
    email: z.string().email(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const { email } = req.body;

  try {
    const user = await Users.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const mailMeta = await setAndSendVerificationOtp(user);

    return res.json({
      message: "OTP resent successfully",
      ...(mailMeta.debugOtp ? { debugOtp: mailMeta.debugOtp } : {}),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Failed to resend OTP" });
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

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Email not verified. Please verify with OTP.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ message: "Invalid email or password" });

    const auth = issueAuthPayload(user);

    return res.json({
      ...auth,
      message: "Signin successful",
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

    const auth = issueAuthPayload(user);

    return res.json({
      message: "Successfully upgraded to admin",
      ...auth,
    });
  } catch {
    return res.status(500).json({ message: "Error authenticating admin" });
  }
}
