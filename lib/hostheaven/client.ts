type HostHeavenConfig = {
  baseUrl: string;
  email: string;
  password: string;
  resellerDomain: string;
};

type HostHeavenSession = {
  token: string;
  userId: number;
  isReseller: boolean;
  expiresAt: number;
};

type UserOrderOverview = {
  vmId?: number;
  orderId?: string;
  ipAddress?: string;
  dbStatus?: string;
  liveState?: string;
  osType?: string;
  os?: string;
  assigned?: boolean;
  locked?: boolean;
  assignedToEmail?: string | null;
  monthlyPrice?: number;
  cores?: number;
  ram?: number;
  storage?: number;
  serverPlan?: string;
  zoneName?: string;
};

export type HostHeavenVmCredentials = {
  vmId: number;
  ip: string;
  username: string;
  password: string;
};

type ZoneSummary = { id: number; name?: string; status?: string };

let sessionCache: HostHeavenSession | null = null;

function getConfig(): HostHeavenConfig {
  const baseUrl = (process.env.HOSTHEAVEN_API_BASE_URL || "https://vps.hostheaven.in").replace(
    /\/$/,
    ""
  );
  const email = process.env.HOSTHEAVEN_EMAIL?.trim() || "";
  const password = process.env.HOSTHEAVEN_PASSWORD || "";
  const resellerDomain =
    process.env.HOSTHEAVEN_RESELLER_DOMAIN?.trim() || "vps.hostheaven.in";

  if (!email || !password) {
    throw new Error(
      "HostHeaven is not configured. Set HOSTHEAVEN_EMAIL and HOSTHEAVEN_PASSWORD in .env."
    );
  }

  return { baseUrl, email, password, resellerDomain };
}

function parseJwtUserId(token: string): number | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    ) as { userId?: unknown };
    return typeof payload.userId === "number" && payload.userId > 0
      ? Math.round(payload.userId)
      : null;
  } catch {
    return null;
  }
}

async function loginStandard(config: HostHeavenConfig): Promise<HostHeavenSession | null> {
  const res = await fetch(`${config.baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    token?: string;
    reseller?: boolean;
  } | null;
  if (!data?.token) return null;

  const userId = parseJwtUserId(data.token);
  if (!userId) return null;

  return {
    token: data.token,
    userId,
    isReseller: Boolean(data.reseller),
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
}

async function loginReseller(config: HostHeavenConfig): Promise<HostHeavenSession | null> {
  const res = await fetch(`${config.baseUrl}/api/reseller/auth/login/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Reseller-Domain": config.resellerDomain,
    },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { token?: string } | null;
  if (!data?.token) return null;

  const userId = parseJwtUserId(data.token);
  if (!userId) return null;

  return {
    token: data.token,
    userId,
    isReseller: true,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
}

export async function getHostHeavenSession(forceRefresh = false): Promise<HostHeavenSession> {
  if (!forceRefresh && sessionCache && sessionCache.expiresAt > Date.now()) {
    return sessionCache;
  }

  const config = getConfig();
  const session =
    (await loginStandard(config)) ||
    (await loginReseller(config));

  if (!session) {
    throw new Error("HostHeaven login failed. Check email and password.");
  }

  sessionCache = session;
  return session;
}

export async function getHostHeavenToken(forceRefresh = false): Promise<string> {
  return (await getHostHeavenSession(forceRefresh)).token;
}

async function hostHeavenRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  useResellerHeaders?: boolean
): Promise<T> {
  const config = getConfig();
  const session = await getHostHeavenSession(!retry);
  const resellerHeaders = useResellerHeaders ?? session.isReseller;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.token}`);
  if (resellerHeaders) {
    headers.set("X-Reseller-Domain", config.resellerDomain);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401 && retry) {
    sessionCache = null;
    return hostHeavenRequest<T>(path, init, false, useResellerHeaders);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : `HostHeaven API error (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export type HostHeavenIso = {
  id: number;
  isoName: string;
  osType: string;
};

export type HostHeavenVm = {
  id: number;
  ips: string[];
  status?: string;
  assigned?: boolean;
  locked?: boolean;
  os?: string;
  monthlyPrice?: number;
  cores?: number;
  ram?: number;
  storage?: number;
  raw: Record<string, unknown>;
};

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase();
}

function isIpv4(ip: string): boolean {
  return IPV4_RE.test(normalizeIp(ip));
}

function pushIp(value: unknown, ips: string[]): void {
  if (typeof value !== "string") return;
  const normalized = normalizeIp(value);
  if (isIpv4(normalized)) ips.push(normalized);
}

function collectIpv4Strings(value: unknown, ips: string[], depth: number): void {
  if (depth > 6 || value == null) return;

  if (typeof value === "string") {
    const matches = value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    if (matches) {
      for (const match of matches) pushIp(match, ips);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectIpv4Strings(item, ips, depth + 1);
    return;
  }

  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectIpv4Strings(nested, ips, depth + 1);
    }
  }
}

function extractVmIps(entry: Record<string, unknown>): string[] {
  const ips: string[] = [];
  collectIpv4Strings(entry, ips, 0);
  return [...new Set(ips)];
}

function extractVmId(entry: Record<string, unknown>): number | null {
  const id = entry.id ?? entry.vmId ?? entry.vm_id;
  if (typeof id === "number" && id > 0) return Math.round(id);
  if (typeof id === "string" && /^\d+$/.test(id.trim())) return parseInt(id.trim(), 10);
  return null;
}

function unwrapVmList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  for (const key of ["vms", "data", "items", "results", "content", "orders"]) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return [];
}

function normalizeVm(entry: unknown): HostHeavenVm | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  const id = extractVmId(raw);
  if (!id) return null;
  return { id, ips: extractVmIps(raw), raw };
}

function normalizeUserOrderVm(order: UserOrderOverview): HostHeavenVm | null {
  if (!order.vmId || order.vmId <= 0) return null;
  const raw: Record<string, unknown> = { ...order };
  const ips = order.ipAddress ? [normalizeIp(order.ipAddress)] : [];
  return {
    id: Math.round(order.vmId),
    ips,
    status: order.dbStatus,
    assigned: Boolean(order.assigned) || Boolean(order.assignedToEmail),
    locked: Boolean(order.locked),
    os: order.os || order.osType,
    monthlyPrice:
      typeof order.monthlyPrice === "number" && order.monthlyPrice > 0
        ? order.monthlyPrice
        : undefined,
    cores: typeof order.cores === "number" && order.cores > 0 ? order.cores : undefined,
    ram: typeof order.ram === "number" && order.ram > 0 ? order.ram : undefined,
    storage: typeof order.storage === "number" && order.storage > 0 ? order.storage : undefined,
    raw,
  };
}

async function listResellerVms(): Promise<HostHeavenVm[]> {
  const data = await hostHeavenRequest<unknown>(
    "/api/reseller/user/vms",
    { method: "GET" },
    true,
    true
  );
  return unwrapVmList(data)
    .map(normalizeVm)
    .filter((vm): vm is HostHeavenVm => vm !== null);
}

async function listUserVms(): Promise<HostHeavenVm[]> {
  const data = await hostHeavenRequest<{ orders?: UserOrderOverview[] }>(
    "/api/users/orders/overview?page=0&size=500&sortBy=createdAt&sortDir=desc",
    { method: "GET" },
    true,
    false
  );

  return (data.orders ?? [])
    .filter((order) => (order.dbStatus ?? "ACTIVE").toUpperCase() === "ACTIVE")
    .map(normalizeUserOrderVm)
    .filter((vm): vm is HostHeavenVm => vm !== null);
}

export async function hostHeavenListVms(): Promise<HostHeavenVm[]> {
  const session = await getHostHeavenSession();
  if (session.isReseller) {
    return enrichVmIps(await listResellerVms());
  }
  return listUserVms();
}

async function hostHeavenGetVmDetails(vmId: number): Promise<Record<string, unknown>> {
  const data = await hostHeavenRequest<unknown>(
    `/api/reseller/user/vms/${vmId}/details`,
    { method: "GET" },
    true,
    true
  );
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

async function enrichVmIps(vms: HostHeavenVm[]): Promise<HostHeavenVm[]> {
  const needsDetails = vms.some((vm) => vm.ips.length === 0);
  if (!needsDetails) return vms;

  return Promise.all(
    vms.map(async (vm) => {
      if (vm.ips.length > 0) return vm;
      try {
        const details = await hostHeavenGetVmDetails(vm.id);
        const ips = extractVmIps({ ...vm.raw, ...details });
        return ips.length > 0 ? { ...vm, ips } : vm;
      } catch {
        return vm;
      }
    })
  );
}

function pickCredentialField(
  data: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Fetch live IP + username + password for a HostHeaven VM. */
export async function hostHeavenGetVmCredentials(
  vmId: number,
  fallbackIp?: string
): Promise<HostHeavenVmCredentials> {
  const session = await getHostHeavenSession();
  let username = "root";
  let password = "";
  let ip = (fallbackIp ?? "").trim();

  try {
    const pwdData = await hostHeavenRequest<Record<string, unknown>>(
      `/api/users/${session.userId}/vms/${vmId}/password`,
      { method: "GET" },
      true,
      false
    );
    password = pickCredentialField(pwdData, ["password", "rootPassword", "passwd"]);
    username =
      pickCredentialField(pwdData, ["username", "user", "login", "rootUser"]) || username;
  } catch {
    /* fall through to order details */
  }

  try {
    const details = await hostHeavenRequest<Record<string, unknown>>(
      `/api/users/orders/${vmId}/details`,
      { method: "GET" },
      true,
      false
    );
    if (!password) {
      password = pickCredentialField(details, [
        "password",
        "rootPassword",
        "passwd",
        "vpsPassword",
      ]);
    }
    username =
      pickCredentialField(details, ["username", "user", "login", "rootUser"]) || username;
    if (!ip) {
      const detailIps = extractVmIps(details);
      if (detailIps[0]) ip = detailIps[0];
    }
  } catch {
    /* ignore — password endpoint may already be enough */
  }

  if (!ip) {
    const vms = await hostHeavenListVms();
    const match = vms.find((vm) => vm.id === vmId);
    if (match?.ips[0]) ip = match.ips[0];
  }

  if (!ip || !password) {
    throw new Error(
      `Could not load credentials for HostHeaven VM ${vmId}. IP or password missing.`
    );
  }

  return { vmId, ip, username: username || "root", password };
}

/** Find HostHeaven VM database id by matching the server's public IPv4. */
export async function hostHeavenFindVmIdByIp(ip: string): Promise<number> {
  const want = normalizeIp(ip);
  if (!want || !isIpv4(want)) {
    throw new Error("Server IP is missing or invalid for HostHeaven lookup.");
  }

  const vms = await hostHeavenListVms();
  const matches = vms.filter((vm) => vm.ips.includes(want));

  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) {
    throw new Error(
      `Multiple HostHeaven VMs match IP ${ip}. Add VM ID on the stock item to pick one.`
    );
  }

  throw new Error(
    `No HostHeaven VM found for IP ${ip}. Confirm the IP in HostHeaven matches the delivered server IP.`
  );
}

async function userControlVm(
  vmId: number,
  action: "start" | "stop" | "reboot"
): Promise<void> {
  const session = await getHostHeavenSession();
  await hostHeavenRequest(
    `/api/users/${session.userId}/vms/${vmId}/control?action=${encodeURIComponent(action)}`,
    { method: "POST" },
    true,
    false
  );
}

export async function hostHeavenStartVm(vmId: number): Promise<void> {
  const session = await getHostHeavenSession();
  if (session.isReseller) {
    await hostHeavenRequest(
      `/api/reseller/user/vms/${vmId}/start`,
      { method: "POST" },
      true,
      true
    );
    return;
  }
  await userControlVm(vmId, "start");
}

export async function hostHeavenStopVm(vmId: number): Promise<void> {
  const session = await getHostHeavenSession();
  if (session.isReseller) {
    await hostHeavenRequest(
      `/api/reseller/user/vms/${vmId}/stop`,
      { method: "POST" },
      true,
      true
    );
    return;
  }
  await userControlVm(vmId, "stop");
}

export async function hostHeavenRebootVm(vmId: number): Promise<void> {
  const session = await getHostHeavenSession();
  if (session.isReseller) {
    await hostHeavenRequest(
      `/api/reseller/user/vms/${vmId}/reboot`,
      { method: "POST" },
      true,
      true
    );
    return;
  }
  await userControlVm(vmId, "reboot");
}

export async function hostHeavenChangePassword(
  vmId: number,
  newPassword: string
): Promise<void> {
  const session = await getHostHeavenSession();
  if (session.isReseller) {
    await hostHeavenRequest(
      `/api/reseller/user/vms/${vmId}/password`,
      {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      },
      true,
      true
    );
    return;
  }

  await hostHeavenRequest(
    `/api/users/${session.userId}/vms/${vmId}/password`,
    {
      method: "PUT",
      body: JSON.stringify({ password: newPassword }),
    },
    true,
    false
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** HostHeaven rejects password changes while rebuild is still running — retry until ready. */
export async function hostHeavenChangePasswordWithRetry(
  vmId: number,
  newPassword: string,
  options?: { attempts?: number; delayMs?: number }
): Promise<{ synced: boolean; attempts: number; error?: string }> {
  const attempts = options?.attempts ?? 12;
  const delayMs = options?.delayMs ?? 15000;
  let lastError = "";

  for (let i = 1; i <= attempts; i++) {
    try {
      await hostHeavenChangePassword(vmId, newPassword);
      return { synced: true, attempts: i };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Password sync failed.";
      if (i < attempts) {
        await sleep(delayMs);
      }
    }
  }

  return { synced: false, attempts, error: lastError };
}

export async function hostHeavenRebuildVm(
  vmId: number,
  newIsoId: number,
  newPassword?: string
): Promise<void> {
  const session = await getHostHeavenSession();
  if (session.isReseller) {
    await hostHeavenRequest(
      `/api/reseller/user/vms/${vmId}/rebuild`,
      {
        method: "POST",
        body: JSON.stringify({
          newIsoId,
          ...(newPassword ? { newPassword, password: newPassword } : {}),
        }),
      },
      true,
      true
    );
    return;
  }

  const qs = new URLSearchParams({ isoId: String(newIsoId) });
  if (newPassword) qs.set("password", newPassword);

  await hostHeavenRequest(
    `/api/users/${session.userId}/vms/${vmId}/rebuild?${qs.toString()}`,
    {
      method: "POST",
      ...(newPassword
        ? { body: JSON.stringify({ password: newPassword }) }
        : {}),
    },
    true,
    false
  );
}

function normalizeIso(entry: unknown): HostHeavenIso | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  const id = raw.id ?? raw.isoId;
  if (typeof id !== "number" || id <= 0) return null;
  const isoName =
    typeof raw.isoName === "string"
      ? raw.isoName
      : typeof raw.name === "string"
        ? raw.name
        : "ISO";
  const osType =
    typeof raw.osType === "string"
      ? raw.osType
      : typeof raw.type === "string"
        ? raw.type
        : isoName;
  return { id: Math.round(id), isoName, osType };
}

async function listUserIsos(serverIp?: string): Promise<HostHeavenIso[]> {
  const zones = await hostHeavenRequest<ZoneSummary[]>("/api/users/zones", { method: "GET" }, true, false);
  if (!Array.isArray(zones) || zones.length === 0) return [];

  const activeZones = zones.filter((zone) => (zone.status ?? "ACTIVE").toUpperCase() === "ACTIVE");
  const candidates = activeZones.length > 0 ? activeZones : zones;
  const ip = (serverIp ?? "").trim();

  let zone = candidates[0];
  if (ip) {
    const octets = ip.split(".");
    const prefix3 = octets.length >= 3 ? `${octets[0]}.${octets[1]}.${octets[2]}` : "";
    const prefix2 = octets.length >= 2 ? `${octets[0]}.${octets[1]}` : "";
    zone =
      candidates.find((z) => prefix3 && (z.name ?? "").includes(prefix3)) ??
      candidates.find((z) => prefix2 && (z.name ?? "").includes(prefix2)) ??
      candidates[0];
  }

  if (!zone?.id) return [];

  const isos = await hostHeavenRequest<unknown[]>(
    `/api/users/zones/${zone.id}/isos`,
    { method: "GET" },
    true,
    false
  );

  if (!Array.isArray(isos)) return [];
  return isos.map(normalizeIso).filter((iso): iso is HostHeavenIso => iso !== null);
}

export async function hostHeavenListIsos(vmId: number, serverIp?: string): Promise<HostHeavenIso[]> {
  const session = await getHostHeavenSession();
  if (session.isReseller) {
    const data = await hostHeavenRequest<HostHeavenIso[]>(
      `/api/reseller/user/vms/${vmId}/isos`,
      { method: "GET" },
      true,
      true
    );
    return Array.isArray(data) ? data : [];
  }
  return listUserIsos(serverIp);
}

export function isHostHeavenConfigured(): boolean {
  return Boolean(process.env.HOSTHEAVEN_EMAIL?.trim() && process.env.HOSTHEAVEN_PASSWORD);
}
