export const ADMIN_BASE_PATH = "/rockyelfadmin";

const ADMIN_KEY = "linuxpro_admin";

/** UI gate only — real auth is the httpOnly cookie from /api/admin/login. */
export async function adminLogin(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return false;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ADMIN_KEY, "true");
    }
    return true;
  } catch {
    return false;
  }
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_KEY) === "true";
}

export function adminLogout(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ADMIN_KEY);
  }
  void fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(
    () => undefined
  );
}
