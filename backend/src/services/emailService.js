import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function getTransporter() {
  const hasSmtpConfig =
    env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM;

  if (!hasSmtpConfig) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendOtpMail({ to, name, otp }) {
  const transporter = getTransporter();
  if (!transporter) {
    const msg = `OTP for ${to}: ${otp}`;
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM");
    }
    console.log(msg);
    return { delivered: false, preview: true };
  }

  const sendPromise = transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "QuizMaster Email Verification OTP",
    text: `Hi ${name || "there"}, your QuizMaster OTP is ${otp}. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.`,
    html: `<p>Hi ${name || "there"},</p><p>Your QuizMaster OTP is <strong>${otp}</strong>.</p><p>This OTP expires in ${env.OTP_EXPIRY_MINUTES} minutes.</p>`,
  });
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("SMTP timeout while sending OTP email")), 12000);
  });

  await Promise.race([sendPromise, timeoutPromise]);

  return { delivered: true, preview: false };
}
