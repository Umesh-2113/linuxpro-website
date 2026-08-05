import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "linuxpro_admin_session";
const SESSION_DAYS = 7;

function getAdminSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "linuxpro-admin-dev-secret"
  );
}

export function getAdminCredentials(): { email: string; password: string } {
  return {
    email: (process.env.ADMIN_EMAIL || "skodia.in@gmail.com").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "Sanjay@885522",
  };
}

export function createAdminSessionToken(): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `admin:${exp}`;
  const sig = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || !token.includes(".")) return false;
  const lastDot = token.lastIndexOf(".");
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!payload.startsWith("admin:") || !sig) return false;

  const expected = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const exp = Number(payload.slice("admin:".length));
  return Number.isFinite(exp) && exp > Date.now();
}

export function adminSessionCookieOptions(maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function hasValidAdminSessionCookie(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminSessionToken(jar.get(ADMIN_SESSION_COOKIE)?.value);
}

export function verifyAdminPassword(email: string, password: string): boolean {
  const creds = getAdminCredentials();
  return (
    email.trim().toLowerCase() === creds.email && password === creds.password
  );
}
