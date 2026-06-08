import { apiPost } from "@/lib/api-client";
import type { AuthProvider } from "./users";

export type User = {
  email: string;
  name: string;
  avatarUrl?: string;
  provider?: AuthProvider;
};

const STORAGE_KEY = "linuxpro_user";

export function setUser(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ user: User | null; error?: string }> {
  if (!name.trim() || !email.trim() || password.length < 6) {
    return { user: null, error: "Please fill in all fields correctly." };
  }

  try {
    const data = await apiPost<{ user: User }>("/api/users/register", {
      name,
      email,
      password,
    });
    return { user: { ...data.user, provider: "email" } };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Could not create account.",
    };
  }
}

export function userFromSession(input: {
  email: string;
  name: string;
  avatarUrl?: string;
  provider?: string;
}): User {
  const provider =
    input.provider === "google" ||
    input.provider === "github" ||
    input.provider === "azure-ad"
      ? input.provider
      : input.provider === "email"
        ? "email"
        : undefined;

  return {
    email: input.email.trim(),
    name: input.name.trim() || input.email.split("@")[0],
    avatarUrl: input.avatarUrl,
    provider,
  };
}
