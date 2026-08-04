import { apiGet, apiPatch } from "@/lib/api-client";
import type { StockProvider } from "@/lib/stock-providers";
import { getOrderSubtitle, type Order } from "@/lib/orders";
import type { StockType } from "@/lib/stock";

export type UserServer = {
  id: string;
  orderId: string;
  userEmail: string;
  userName: string;
  name: string;
  type: StockType;
  plan: string;
  ip: string;
  username: string;
  password: string;
  port: string;
  region: string;
  os: string;
  status: "active" | "suspended";
  powerState: "running" | "stopped" | "unknown";
  provider?: StockProvider;
  providerVmId?: number;
  stockId?: string;
  createdAt: string;
};

let cache: UserServer[] = [];
let fetchPromise: Promise<UserServer[]> | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mergeUserServers(servers: UserServer[], email: string): void {
  const normalized = normalizeEmail(email);
  const rest = cache.filter((s) => normalizeEmail(s.userEmail) !== normalized);
  cache = [...servers, ...rest];
}

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("servers-updated"));
  }
}

export async function fetchServers(email?: string): Promise<UserServer[]> {
  const path = email ? `/api/servers?email=${encodeURIComponent(email)}` : "/api/servers";
  if (!email && fetchPromise) return fetchPromise;

  const promise = apiGet<UserServer[]>(path)
    .then((servers) => {
      const normalized = servers.map((s) => ({
        ...s,
        powerState: s.powerState ?? "running",
      }));
      if (email) {
        mergeUserServers(normalized, email);
        emitUpdate();
        return normalized;
      }
      cache = normalized;
      fetchPromise = null;
      emitUpdate();
      return normalized;
    })
    .catch((err) => {
      if (!email) fetchPromise = null;
      console.error("[fetchServers]", err);
      return email ? [] : cache;
    });

  if (!email) fetchPromise = promise;
  return promise;
}

export function getUserServers(): UserServer[] {
  return [...cache].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getServersByUser(email: string): UserServer[] {
  const normalized = normalizeEmail(email);
  return getUserServers().filter((s) => normalizeEmail(s.userEmail) === normalized);
}

export function getServersByOrder(orderId: string): UserServer[] {
  return getUserServers().filter((s) => s.orderId === orderId);
}

export function getServerById(id: string): UserServer | null {
  return getUserServers().find((s) => s.id === id) ?? null;
}

export async function updateUserServer(
  id: string,
  updates: Partial<
    Pick<
      UserServer,
      "ip" | "username" | "password" | "port" | "name" | "status" | "powerState" | "os"
    >
  >
): Promise<UserServer | null> {
  try {
    const updated = await apiPatch<UserServer>(`/api/servers/${id}`, updates);
    cache = cache.map((s) => (s.id === id ? updated : s));
    emitUpdate();
    return updated;
  } catch {
    return null;
  }
}

/** @deprecated Servers are created server-side on order delivery */
export function createServersFromOrder(
  order: Order,
  _creds: { ip: string; username: string; password: string }
): UserServer[] {
  return getServersByOrder(order.id);
}

/** @deprecated Credentials updated server-side */
export function updateServersCredentialsForOrder(
  _orderId: string,
  _creds: { ip: string; username: string; password: string }
): void {
  void fetchServers();
}

/** @deprecated Servers deleted server-side */
export function deleteServersByOrder(_orderId: string): void {
  void fetchServers();
}

export function getOrderSubtitleForServer(order: Order): string {
  return getOrderSubtitle(order);
}
