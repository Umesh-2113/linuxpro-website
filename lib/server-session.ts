import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export function normalizeSessionEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isAdminApiRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-linuxpro-admin") === "true";
}

export async function getClientSessionEmail(): Promise<string | null> {
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
