import nodemailer from "nodemailer";
import { getAdminCredentials } from "@/lib/admin-auth";

export function isAdminMailConfigured(): boolean {
  const user = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  return Boolean(user && pass);
}

function getNotifyTo(): string {
  return (
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    getAdminCredentials().email
  );
}

function getFromAddress(): string {
  const user = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim() || "";
  const name = process.env.SMTP_FROM_NAME?.trim() || "LinuxPro Orders";
  return user ? `"${name}" <${user}>` : name;
}

async function getTransporter() {
  const user = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendViaFormSubmit(input: {
  subject: string;
  text: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const to = getNotifyTo();
  try {
    const res = await fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(to)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: input.subject,
          message: input.text,
          _template: "box",
          _captcha: "false",
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `FormSubmit HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "FormSubmit failed.";
    return { ok: false, error: message };
  }
}

export async function sendAdminEmail(input: {
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    if (isAdminMailConfigured()) {
      const transporter = await getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: getFromAddress(),
          to: getNotifyTo(),
          subject: input.subject,
          text: input.text,
          html:
            input.html ||
            `<pre style="font-family:sans-serif;white-space:pre-wrap">${input.text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</pre>`,
        });
        return { ok: true };
      }
    }

    // Zero-config fallback so admin still gets mail before SMTP is set up.
    // First email to a new address may need one FormSubmit confirmation click.
    const fallback = await sendViaFormSubmit({
      subject: input.subject,
      text: input.text,
    });
    if (!fallback.ok) {
      console.warn(
        "[mail] SMTP not set and FormSubmit failed:",
        fallback.error,
        "— add GMAIL_USER + GMAIL_APP_PASSWORD to .env"
      );
    }
    return fallback;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";
    console.error("[mail]", message);
    return { ok: false, error: message };
  }
}
