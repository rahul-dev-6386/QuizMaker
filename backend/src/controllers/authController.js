import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { getCookieOptions } from "../config/env.js";
import { sendMailWithTimeout } from "../config/mailer.js";
import { Otp, Users } from "../models/index.js";

function buildAuthPayload(user) {
  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

function buildOtpEmail({ name, otp, title, actionLabel, note }) {
  const safeName = name || "there";
  const text = `Hello ${safeName},

${title}

Your One-Time Password (OTP) is: ${otp}

This code will expire in ${env.OTP_EXPIRES_MINUTES} minutes.

${note}

If you did not request this, you can safely ignore this email.

Regards,
QuizMaster Team`;

  const html = `
    <div style="background:#f4f7fb;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#10233f;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe6f3;border-radius:20px;overflow:hidden;box-shadow:0 18px 40px rgba(16,35,63,0.08);">
        <div style="background:linear-gradient(135deg,#155eef,#0f9fa8);padding:24px 28px;color:#ffffff;">
          <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.92;">QuizMaster Security</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.1;">${actionLabel}</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">Hello ${safeName},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#41556f;">${title}</p>
          <div style="margin:22px 0;padding:18px;border-radius:16px;border:1px solid #d7e3f0;background:#f7fbff;text-align:center;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7d94;margin-bottom:8px;">One-Time Password</div>
            <div style="font-size:34px;font-weight:800;letter-spacing:0.22em;color:#0b4acb;">${otp}</div>
          </div>
          <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#41556f;">This code will expire in ${env.OTP_EXPIRES_MINUTES} minutes.</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#41556f;">${note}</p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7d94;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    </div>
  `;

  return { text, html };
}

function readRefreshTokenFromCookies(req) {
  return req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("refreshToken="))
    ?.split("=")[1];
}

async function attachSessionCookies(req, res, user) {
  const cookieOptions = getCookieOptions(req);
  const accessToken = jwt.sign(
    {
      id: user._id.toHexString(),
      role: user.role,
    },
    env.ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      id: user._id.toHexString(),
      role: user.role,
    },
    env.REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }
  );

  if (!user.refreshTokens.includes(refreshToken)) {
    user.refreshTokens.push(refreshToken);
    await user.save();
  }

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);
}

export async function signupHandler(req, res) {
  const schema = z.object({
    email: z.string().trim().toLowerCase().min(4).max(100).email(),
    name: z.string().min(3),
    password: z
      .string()
      .min(8)
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

  const { email, password, name, adminSecret } = parsed.data;
  const role =
    adminSecret && (adminSecret === env.ADMIN_SECRET || adminSecret === env.ADMIN_AUTH_KEY)
      ? "admin"
      : "user";

  try {
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User Already Exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email, purpose: "signup" });
    await Otp.create({
      email,
      otp: await bcrypt.hash(otp, 10),
      purpose: "signup",
      name,
      password: await bcrypt.hash(password, 10),
    });

    try {
      await sendMailWithTimeout({
        to: email,
        subject: "QuizMaster signup verification code",
        ...buildOtpEmail({
          name,
          otp,
          title: "Use the verification code below to complete your QuizMaster account signup.",
          actionLabel: "Verify your account",
          note: "Enter this code on the verification screen to activate your account.",
        }),
      });
    } catch (err) {
      await Otp.deleteMany({ email, purpose: "signup" });
      return res.status(500).json({ message: "Failed to send OTP" });
    }

    return res.json({
      message: "OTP sent to your registered Email",
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Error While sending OTP" });
  }
}

export async function verifyOtpHandler(req, res) {
  const schema = z.object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().length(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
  }

  try {
    const record = await Otp.findOne({
      email: parsed.data.email,
      purpose: "signup",
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: "No Record found" });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({ message: "Too many Attempts Try again later" });
    }

    const isExpired = Date.now() - record.createdAt.getTime() > env.OTP_EXPIRES_MINUTES * 60 * 1000;
    if (isExpired) {
      return res.status(400).json({ message: "OTP is expired" });
    }

    const isMatch = await bcrypt.compare(parsed.data.otp, record.otp);
    if (!isMatch) {
      await Otp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "INVALID OTP" });
    }

    const existingUser = await Users.findOne({ email: parsed.data.email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const role =
      req.body.adminSecret &&
      (req.body.adminSecret === env.ADMIN_SECRET || req.body.adminSecret === env.ADMIN_AUTH_KEY)
        ? "admin"
        : "user";

    const user = await Users.create({
      email: record.email,
      password: record.password,
      name: record.name,
      role,
      isVerified: true,
      refreshTokens: [],
    });

    await Otp.deleteMany({ email: parsed.data.email, purpose: "signup" });
    await attachSessionCookies(req, res, user);

    return res.json({
      message: "You are Signed Up",
      ...buildAuthPayload(user),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Verification Failed" });
  }
}

export const signupRequestOtpHandler = signupHandler;
export const signupVerifyOtpHandler = verifyOtpHandler;

export async function signinHandler(req, res) {
  const schema = z.object({
    email: z.string().trim().toLowerCase().min(4).max(100).email(),
    password: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const { email, password } = parsed.data;
  try {
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(403).json({ message: "User doesn't exist. Please sign up" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    await attachSessionCookies(req, res, user);
    return res.json({
      message: "Login Successfull",
      ...buildAuthPayload(user),
    });
  } catch {
    return res.status(500).json({ message: "Signin error" });
  }
}

export async function refreshHandler(req, res) {
  const refreshToken = readRefreshTokenFromCookies(req);
  if (!refreshToken) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decodedData = jwt.verify(refreshToken, env.REFRESH_SECRET);
    const user = await Users.findById(decodedData.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: "Session revoked or Invalid" });
    }

    const cookieOptions = getCookieOptions(req);
    const newToken = jwt.sign(
      { id: user._id.toHexString(), role: user.role },
      env.ACCESS_SECRET,
      { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN }
    );

    res.cookie("accessToken", newToken, cookieOptions);
    return res.status(200).json({
      message: "Token Updated",
      ...buildAuthPayload(user),
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      const decodedData = jwt.decode(refreshToken);
      if (decodedData?.id) {
        await Users.findByIdAndUpdate(decodedData.id, {
          $pull: { refreshTokens: refreshToken },
        });
      }
    }

    return res.status(401).json({ message: "Session Expired" });
  }
}

export async function logoutHandler(req, res) {
  const refreshToken = readRefreshTokenFromCookies(req);
  const cookieOptions = getCookieOptions(req);

  try {
    let userId = req.userId;

    if (!userId && refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, env.REFRESH_SECRET);
        userId = decoded.id;
      } catch {
        userId = null;
      }
    }

    if (userId) {
      await Users.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken },
      });
    }

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    return res.json({ message: "You are Logged Out" });
  } catch {
    return res.status(500).json({ message: "Logout Failed" });
  }
}

export async function allLogoutHandler(req, res) {
  const cookieOptions = getCookieOptions(req);

  try {
    await Users.findByIdAndUpdate(req.userId, {
      $set: { refreshTokens: [] },
    });

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    return res.json({ message: "Logged Out from all Devices" });
  } catch {
    return res.status(500).json({ message: "Failed to Log out" });
  }
}

export async function getUserInfo(req, res) {
  try {
    const user = await Users.findById(req.userId).select("name email role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      user: {
        id: req.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return res.status(500).json({ message: "Error fetching user info" });
  }
}

export async function forgotPasswordHandler(req, res) {
  const schema = z.object({
    email: z.string().trim().toLowerCase().email(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
  }

  try {
    const user = await Users.findOne({ email: parsed.data.email });
    if (!user) {
      return res.json({ message: "If account exists, OTP sent" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: parsed.data.email, purpose: "password-reset" });
    await Otp.create({
      email: parsed.data.email,
      otp: await bcrypt.hash(otp, 10),
      purpose: "password-reset",
      name: user.name,
      password: user.password,
    });

    try {
      await sendMailWithTimeout({
        to: parsed.data.email,
        subject: "QuizMaster password reset code",
        ...buildOtpEmail({
          name: user.name,
          otp,
          title: "Use the code below to continue resetting your QuizMaster password.",
          actionLabel: "Reset your password",
          note: "Enter this code on the reset-password screen and choose a new secure password.",
        }),
      });
    } catch {
      await Otp.deleteMany({ email: parsed.data.email, purpose: "password-reset" });
      return res.status(500).json({ message: "Error sending OTP" });
    }

    return res.json({
      message: "If account exists, OTP sent",
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Error sending OTP" });
  }
}

export const forgotPasswordRequestOtpHandler = forgotPasswordHandler;

export async function resetPasswordHandler(req, res) {
  const schema = z.object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().length(6),
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
        "Password must contain uppercase, lowercase, number and special character"
      ),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
  }

  try {
    const record = await Otp.findOne({
      email: parsed.data.email,
      purpose: "password-reset",
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const isExpired = Date.now() - record.createdAt.getTime() > env.OTP_EXPIRES_MINUTES * 60 * 1000;
    if (isExpired) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const isMatch = await bcrypt.compare(parsed.data.otp, record.otp);
    if (!isMatch) {
      await Otp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);
    const user = await Users.findOneAndUpdate(
      { email: parsed.data.email },
      {
        password: hashedPassword,
        $set: { refreshTokens: [] },
      },
      { new: true }
    );

    await Otp.deleteMany({ email: parsed.data.email, purpose: "password-reset" });

    if (user) {
      await attachSessionCookies(req, res, user);
    }

    return res.json({
      message: "Password reset successful",
      ...(user ? buildAuthPayload(user) : {}),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Error resetting password" });
  }
}

export const forgotPasswordResetHandler = resetPasswordHandler;
export const refreshTokenHandler = refreshHandler;
export const getCurrentUserHandler = getUserInfo;

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
    await attachSessionCookies(req, res, user);

    return res.json({
      message: "Successfully upgraded to admin",
      ...buildAuthPayload(user),
    });
  } catch {
    return res.status(500).json({ message: "Error authenticating admin" });
  }
}
