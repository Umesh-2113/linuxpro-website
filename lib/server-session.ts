import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hasValidAdminSessionCookie } from "@/lib/admin-auth";

export function normalizeSessionEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True only with a signed httpOnly admin session cookie (header alone is not trusted). */
export async function isAdminApiRequest(): Promise<boolean> {
  return hasValidAdminSessionCookie();
}

export async function getClientSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map(({ name, value }) => [name, value])
      ),
    } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  const tokenEmail =
    typeof token?.email === "string"
      ? token.email
      : typeof token?.sub === "string" && token.sub.includes("@")
        ? token.sub
        : null;

  if (tokenEmail) {
    return normalizeSessionEmail(tokenEmail);
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return email ? normalizeSessionEmail(email) : null;
}

export async function requireClientSession(requestedEmail?: string | null): Promise<
  | { ok: true; email: string; isAdmin: false }
  | { ok: false; status: number; error: string }
> {
  const email = await getClientSessionEmail();
  if (!email) {
    return { ok: false, status: 401, error: "You must be signed in." };
  }

  if (requestedEmail && normalizeSessionEmail(requestedEmail) !== email) {
    return {
      ok: false,
      status: 403,
      error: "You can only access your own account data.",
    };
  }

  return { ok: true, email, isAdmin: false };
}

export async function requireDataAccess(requestedEmail?: string | null): Promise<
  | { ok: true; email: string; isAdmin: boolean }
  | { ok: false; status: number; error: string }
> {
  if (await isAdminApiRequest()) {
    return {
      ok: true,
      email: requestedEmail ? normalizeSessionEmail(requestedEmail) : "",
      isAdmin: true,
    };
  }
  return requireClientSession(requestedEmail);
}
