import { apiGet } from "@/lib/api-client";

export type AuthProvider = "email" | "google" | "github" | "azure-ad";

export type RegisteredUser = {
  email: string;
  name: string;
  registeredAt: string;
  passwordHash?: string;
  provider?: AuthProvider;
  avatarUrl?: string;
};

let cache: RegisteredUser[] = [];
let fetchPromise: Promise<RegisteredUser[]> | null = null;

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("users-updated"));
  }
}

export async function fetchUsers(): Promise<RegisteredUser[]> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = apiGet<RegisteredUser[]>("/api/users")
    .then((users) => {
      cache = users;
      fetchPromise = null;
      emitUpdate();
      return users;
    })
    .catch((err) => {
      fetchPromise = null;
      console.error("[fetchUsers]", err);
      return cache;
    });
  return fetchPromise;
}

export function getUsers(): RegisteredUser[] {
  return cache;
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
