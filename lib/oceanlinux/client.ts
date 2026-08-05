/**
 * OceanLinux Universal Reseller API client.
 * Auth: x-api-key + x-api-secret headers.
 * Docs: GET /api/v1/reseller
 */

export type OceanLinuxProductMemory = {
  key: string;
  price: number;
};

export type OceanLinuxProduct = {
  id: string;
  name: string;
  description?: string;
  serverType?: string;
  available: boolean;
  memories: OceanLinuxProductMemory[];
};

export type OceanLinuxOrder = {
  id: string;
  productId?: string;
  productName?: string;
  ipAddress?: string;
  username?: string;
  password?: string;
  status?: string;
  powerState?: string;
  memory?: string;
  expiryDate?: string;
  raw: Record<string, unknown>;
};

export type OceanLinuxManageAction =
  | "start"
  | "stop"
  | "restart"
  | "status"
  | "sync"
  | "reinstall"
  | "changeos";

type OceanLinuxConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
};

function getConfig(): OceanLinuxConfig {
  const baseUrl = (process.env.OCEANLINUX_API_BASE_URL || "https://oceanlinux.com").replace(
    /\/$/,
    ""
  );
  const apiKey = process.env.OCEANLINUX_API_KEY?.trim() || "";
  const apiSecret = process.env.OCEANLINUX_API_SECRET?.trim() || "";
  if (!apiKey || !apiSecret) {
    throw new Error(
      "OceanLinux is not configured. Set OCEANLINUX_API_KEY and OCEANLINUX_API_SECRET in .env."
    );
  }
  return { baseUrl, apiKey, apiSecret };
}

export function isOceanLinuxConfigured(): boolean {
  return Boolean(
    process.env.OCEANLINUX_API_KEY?.trim() && process.env.OCEANLINUX_API_SECRET?.trim()
  );
}

function authHeaders(config: OceanLinuxConfig): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": config.apiKey,
    "x-api-secret": config.apiSecret,
  };
}

async function olFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ status: number; data: T; text: string }> {
  const config = getConfig();
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      ...authHeaders(config),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data = null as T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    /* non-json */
  }
  return { status: res.status, data, text };
}

function memoryPrice(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.price === "number") return obj.price;
  if (typeof obj.basePrice === "number") return obj.basePrice;
  return 0;
}

function normalizeProduct(raw: Record<string, unknown>): OceanLinuxProduct | null {
  const id = String(raw.id || raw._id || "").trim();
  if (!id) return null;
  const memoryOptions =
    raw.memoryOptions && typeof raw.memoryOptions === "object"
      ? (raw.memoryOptions as Record<string, unknown>)
      : {};
  const memories = Object.keys(memoryOptions)
    .map((key) => ({ key, price: memoryPrice(memoryOptions[key]) }))
    .filter((m) => m.price > 0 || true)
    .sort((a, b) => {
      const ar = Number.parseInt(a.key, 10) || 0;
      const br = Number.parseInt(b.key, 10) || 0;
      return ar - br;
    });

  return {
    id,
    name: String(raw.name || id),
    description: typeof raw.description === "string" ? raw.description : undefined,
    serverType: typeof raw.serverType === "string" ? raw.serverType : undefined,
    available: raw.available !== false,
    memories,
  };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function normalizeOrder(raw: Record<string, unknown>): OceanLinuxOrder {
  const id = pickString(raw, ["id", "_id", "orderId", "order_id"]) || "";
  const creds =
    raw.credentials && typeof raw.credentials === "object"
      ? (raw.credentials as Record<string, unknown>)
      : raw;
  return {
    id,
    productId: pickString(raw, ["productId", "product_id", "stockId"]),
    productName: pickString(raw, ["productName", "product_name", "name"]),
    ipAddress: pickString(creds, ["ipAddress", "ip", "ip_address", "serverIp"]),
    username: pickString(creds, ["username", "user", "login"]),
    password: pickString(creds, ["password", "pass", "rootPassword"]),
    status: pickString(raw, ["status", "orderStatus"]),
    powerState: pickString(raw, ["powerState", "power_state", "state"]),
    memory: pickString(raw, ["memory", "ram", "memoryOption"]),
    expiryDate: pickString(raw, ["expiryDate", "expiresAt", "expiry"]),
    raw,
  };
}

export async function oceanLinuxGetAccount(): Promise<Record<string, unknown>> {
  const { status, data, text } = await olFetch<Record<string, unknown>>(
    "/api/v1/reseller/account"
  );
  if (status >= 400) {
    throw new Error(
      (data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message)
        : text) || "OceanLinux account request failed."
    );
  }
  return data || {};
}

export async function oceanLinuxListProducts(): Promise<OceanLinuxProduct[]> {
  const { status, data, text } = await olFetch<{
    success?: boolean;
    products?: Record<string, unknown>[];
    message?: string;
  }>("/api/v1/reseller/products");
  if (status >= 400) {
    throw new Error(data?.message || text || "Failed to list OceanLinux products.");
  }
  const list = Array.isArray(data?.products) ? data.products : [];
  return list
    .map((p) => normalizeProduct(p))
    .filter((p): p is OceanLinuxProduct => Boolean(p));
}

export async function oceanLinuxListOrders(): Promise<OceanLinuxOrder[]> {
  const { status, data, text } = await olFetch<{
    success?: boolean;
    orders?: Record<string, unknown>[];
    message?: string;
  }>("/api/v1/reseller/orders");
  if (status >= 400) {
    throw new Error(data?.message || text || "Failed to list OceanLinux orders.");
  }
  const list = Array.isArray(data?.orders) ? data.orders : [];
  return list.map((o) => normalizeOrder(o)).filter((o) => o.id);
}

export async function oceanLinuxGetOrder(orderId: string): Promise<OceanLinuxOrder> {
  const id = encodeURIComponent(orderId);
  const { status, data, text } = await olFetch<Record<string, unknown>>(
    `/api/v1/reseller/orders/${id}`
  );
  if (status >= 400) {
    const msg =
      data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message)
        : text;
    throw new Error(msg || "Failed to load OceanLinux order.");
  }
  const raw =
    data && typeof data === "object" && "order" in data && data.order
      ? (data.order as Record<string, unknown>)
      : (data as Record<string, unknown>) || {};
  const order = normalizeOrder({ ...raw, id: raw.id || raw._id || orderId });
  if (!order.id) order.id = orderId;
  return order;
}

export async function oceanLinuxBuyOrder(input: {
  productId: string;
  memory: string;
  quantity?: number;
}): Promise<OceanLinuxOrder> {
  const body = {
    productId: input.productId,
    memoryOption: input.memory,
    quantity: input.quantity ?? 1,
  };
  const { status, data, text } = await olFetch<Record<string, unknown>>(
    "/api/v1/reseller/orders",
    { method: "POST", body: JSON.stringify(body) }
  );
  if (status >= 400) {
    const msg =
      data && typeof data === "object"
        ? String(
            (data as { message?: unknown; error?: unknown }).message ||
              (data as { error?: unknown }).error ||
              text
          )
        : text;
    throw new Error(msg || "OceanLinux purchase failed.");
  }
  const raw =
    data && typeof data === "object" && "order" in data && data.order
      ? (data.order as Record<string, unknown>)
      : (data as Record<string, unknown>) || {};
  return normalizeOrder(raw);
}

export async function oceanLinuxManageOrder(input: {
  orderId: string;
  action: OceanLinuxManageAction;
  osType?: string;
}): Promise<Record<string, unknown>> {
  const { status, data, text } = await olFetch<Record<string, unknown>>(
    "/api/v1/reseller/orders/manage",
    {
      method: "POST",
      body: JSON.stringify({
        orderId: input.orderId,
        action: input.action,
        ...(input.osType ? { osType: input.osType } : {}),
      }),
    }
  );
  if (status >= 400) {
    const msg =
      data && typeof data === "object"
        ? String(
            (data as { message?: unknown; error?: unknown }).message ||
              (data as { error?: unknown }).error ||
              text
          )
        : text;
    throw new Error(msg || `OceanLinux ${input.action} failed.`);
  }
  return data || {};
}

export async function oceanLinuxSyncOrder(orderId: string): Promise<{
  ipAddress?: string;
  username?: string;
  password?: string;
  expiryDate?: string;
  daysRemaining?: number;
  status?: string;
  raw: Record<string, unknown>;
}> {
  const id = encodeURIComponent(orderId);
  const { status, data, text } = await olFetch<Record<string, unknown>>(
    `/api/v1/reseller/orders/${id}/sync`,
    { method: "POST", body: "{}" }
  );
  if (status >= 400) {
    const msg =
      data && typeof data === "object"
        ? String(
            (data as { message?: unknown; error?: unknown }).message ||
              (data as { error?: unknown }).error ||
              text
          )
        : text;
    throw new Error(msg || "OceanLinux sync failed.");
  }
  const raw = data || {};
  const validity =
    raw.validity && typeof raw.validity === "object"
      ? (raw.validity as Record<string, unknown>)
      : {};
  return {
    ipAddress: pickString(raw, ["ipAddress", "ip"]),
    username: pickString(raw, ["username", "user"]),
    password: pickString(raw, ["password", "pass"]),
    expiryDate: pickString(validity, ["expiryDate", "expiresAt"]) || pickString(raw, ["expiryDate"]),
    daysRemaining:
      typeof validity.daysRemaining === "number" ? validity.daysRemaining : undefined,
    status: pickString(validity, ["status"]) || pickString(raw, ["status"]),
    raw,
  };
}

export async function oceanLinuxGetStatus(orderId: string): Promise<{
  online?: boolean;
  powerState?: string;
}> {
  const id = encodeURIComponent(orderId);
  const { status, data, text } = await olFetch<Record<string, unknown>>(
    `/api/v1/reseller/orders/${id}/status`
  );
  if (status >= 400) {
    const msg =
      data && typeof data === "object"
        ? String(
            (data as { message?: unknown; error?: unknown }).message ||
              (data as { error?: unknown }).error ||
              text
          )
        : text;
    throw new Error(msg || "OceanLinux status failed.");
  }
  const raw = data || {};
  return {
    online: typeof raw.online === "boolean" ? raw.online : undefined,
    powerState: pickString(raw, ["powerState", "state"]),
  };
}

export async function oceanLinuxFindOrderIdByIp(ip: string): Promise<string | null> {
  const needle = ip.trim().toLowerCase();
  if (!needle) return null;
  const orders = await oceanLinuxListOrders();
  const match = orders.find((o) => (o.ipAddress || "").trim().toLowerCase() === needle);
  return match?.id || null;
}
