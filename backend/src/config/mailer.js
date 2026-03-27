import nodemailer from "nodemailer";
import { env } from "./env.js";

let transporter;
const MAIL_TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS || 45000);

function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_FROM) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: Number(env.SMTP_PORT) === 465,
    connectionTimeout: MAIL_TIMEOUT_MS,
    greetingTimeout: MAIL_TIMEOUT_MS,
    socketTimeout: MAIL_TIMEOUT_MS,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendMailWithTimeout({ to, subject, text, html }) {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log(`[MAIL PREVIEW] to=${to} subject="${subject}" text="${text}"`);
    throw new Error("SMTP mailer is not configured");
  }

  const info = await Promise.race([
    mailTransporter.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text,
      html,
    }),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Email send timeout after ${MAIL_TIMEOUT_MS / 1000} seconds`)),
        MAIL_TIMEOUT_MS
      );
    }),
  ]);

  return {
    delivered: true,
    messageId: info.messageId,
  };
}
