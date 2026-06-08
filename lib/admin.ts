export const ADMIN_BASE_PATH = "/rockyelfadmin";

const ADMIN_KEY = "linuxpro_admin";

const ADMIN_EMAIL = "skodia.in@gmail.com";
const ADMIN_PASSWORD = "Sanjay@885522";

export function adminLogin(email: string, password: string): boolean {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ADMIN_KEY, "true");
    }
    return true;
  }
  return false;
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_KEY) === "true";
}

export function adminLogout(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ADMIN_KEY);
  }
}
