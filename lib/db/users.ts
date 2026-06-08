import { createHash } from "crypto";
import type { AuthProvider, RegisteredUser } from "@/lib/users";
import { getCollection } from "@/lib/mongodb";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function collection() {
  return getCollection<RegisteredUser>("users");
}

export async function dbGetUsers(): Promise<RegisteredUser[]> {
  return (await collection()).find({}).sort({ registeredAt: -1 }).toArray();
}

export async function dbFindUserByEmail(email: string): Promise<RegisteredUser | null> {
  const normalized = normalizeEmail(email);
  return (await collection()).findOne({
    email: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });
}

function isOAuthProvider(provider?: AuthProvider): boolean {
  return provider === "google" || provider === "github" || provider === "azure-ad";
}

export function providerLabel(provider?: AuthProvider): string {
  switch (provider) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    case "azure-ad":
      return "Microsoft";
    case "email":
      return "Email";
    default:
      return "Email";
  }
}

export async function dbOAuthSignIn(input: {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: AuthProvider;
}): Promise<{ ok: boolean; error?: string; user?: RegisteredUser }> {
  if (!isOAuthProvider(input.provider)) {
    return { ok: false, error: "invalid_provider" };
  }

  const email = input.email.trim();
  const existing = await dbFindUserByEmail(email);

  if (!existing) {
    const created: RegisteredUser = {
      email,
      name: input.name.trim() || email.split("@")[0],
      registeredAt: new Date().toISOString(),
      provider: input.provider,
      avatarUrl: input.avatarUrl,
    };
    await (await collection()).insertOne(created);
    return { ok: true, user: created };
  }

  if (existing.provider === "email" || existing.passwordHash) {
    return { ok: false, error: "email_account_exists" };
  }

  if (existing.provider !== input.provider) {
    return { ok: false, error: "wrong_oauth_provider" };
  }

  const updated: RegisteredUser = {
    ...existing,
    name: input.name.trim() || existing.name,
    avatarUrl: input.avatarUrl ?? existing.avatarUrl,
  };
  await (await collection()).updateOne({ email: existing.email }, { $set: updated });
  return { ok: true, user: updated };
}

export async function dbRegisterWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ user: RegisteredUser | null; error?: string }> {
  if (!name.trim() || !email.trim() || password.length < 6) {
    return { user: null, error: "Please fill in all fields correctly." };
  }

  const existing = await dbFindUserByEmail(email);
  if (existing) {
    if (isOAuthProvider(existing.provider)) {
      return {
        user: null,
        error: `This email is registered with ${providerLabel(existing.provider)}. Use that button to sign in.`,
      };
    }
    return {
      user: null,
      error: "An account with this email already exists. Sign in instead.",
    };
  }

  const created: RegisteredUser = {
    email: email.trim(),
    name: name.trim(),
    registeredAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
    provider: "email",
  };
  await (await collection()).insertOne(created);
  return { user: created };
}

export async function dbLoginWithEmail(
  email: string,
  password: string
): Promise<{ user: RegisteredUser | null; error?: string }> {
  if (!email.trim() || !password.trim()) {
    return { user: null, error: "Please enter your email and password." };
  }

  const existing = await dbFindUserByEmail(email);
  if (!existing) {
    return {
      user: null,
      error: "No account found with this email. Create an account first.",
    };
  }

  if (isOAuthProvider(existing.provider) && !existing.passwordHash) {
    return {
      user: null,
      error: `This account uses ${providerLabel(existing.provider)} sign-in. Use that option above.`,
    };
  }

  if (!existing.passwordHash) {
    return {
      user: null,
      error: "Invalid account setup. Please contact support.",
    };
  }

  const passwordHash = hashPassword(password);
  if (existing.passwordHash !== passwordHash) {
    return { user: null, error: "Incorrect password." };
  }

  return { user: existing };
}
