import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";

export type ServerActionType = "start" | "stop" | "reinstall";

export type ReinstallOsOption = "windows" | "ubuntu";

export type ServerActionStatus = "pending" | "processing" | "completed" | "rejected";

export type ServerActionRequest = {
  id: string;
  serverId: string;
  serverName: string;
  serverIp: string;
  orderId: string;
  userEmail: string;
  userName: string;
  action: ServerActionType;
  reinstallOs?: ReinstallOsOption;
  newUsername?: string;
  newPassword?: string;
  status: ServerActionStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

export const reinstallOsOptions: ReinstallOsOption[] = ["windows", "ubuntu"];

export const reinstallOsLabels: Record<ReinstallOsOption, string> = {
  windows: "Windows Server",
  ubuntu: "Ubuntu",
};

export const serverActionLabels: Record<ServerActionType, string> = {
  start: "Start",
  stop: "Stop",
  reinstall: "Reinstall OS",
};

export const serverActionDescriptions: Record<ServerActionType, string> = {
  start: "Power on your server",
  stop: "Shut down your server",
  reinstall: "Fresh OS installation with new credentials",
};

export const actionStatusLabels: Record<ServerActionStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  rejected: "Rejected",
};

let cache: ServerActionRequest[] = [];
let fetchPromise: Promise<ServerActionRequest[]> | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mergeUserActions(actions: ServerActionRequest[], email: string): void {
  const normalized = normalizeEmail(email);
  const rest = cache.filter((a) => normalizeEmail(a.userEmail) !== normalized);
  cache = [...actions, ...rest];
}

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("server-actions-updated"));
  }
}

export async function fetchServerActions(email?: string): Promise<ServerActionRequest[]> {
  const path = email
    ? `/api/server-actions?email=${encodeURIComponent(email)}`
    : "/api/server-actions";
  if (!email && fetchPromise) return fetchPromise;

  const promise = apiGet<ServerActionRequest[]>(path)
    .then((actions) => {
      if (email) {
        mergeUserActions(actions, email);
        emitUpdate();
        return actions;
      }
      cache = actions;
      fetchPromise = null;
      emitUpdate();
      return actions;
    })
    .catch((err) => {
      if (!email) fetchPromise = null;
      console.error("[fetchServerActions]", err);
      return email ? [] : cache;
    });

  if (!email) fetchPromise = promise;
  return promise;
}

export function getServerActions(): ServerActionRequest[] {
  return [...cache].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getActionsByServer(serverId: string): ServerActionRequest[] {
  return getServerActions().filter((a) => a.serverId === serverId);
}

export function getActionsByUser(email: string): ServerActionRequest[] {
  const normalized = normalizeEmail(email);
  return getServerActions().filter((a) => normalizeEmail(a.userEmail) === normalized);
}

export function getActionStats() {
  const all = getServerActions();
  return {
    total: all.length,
    pending: all.filter((a) => a.status === "pending").length,
    processing: all.filter((a) => a.status === "processing").length,
    completed: all.filter((a) => a.status === "completed").length,
  };
}

export async function createServerAction(data: {
  serverId: string;
  serverName: string;
  serverIp: string;
  orderId: string;
  userEmail: string;
  userName: string;
  action: ServerActionType;
  reinstallOs?: ReinstallOsOption;
}): Promise<ServerActionRequest> {
  const request = await apiPost<ServerActionRequest>("/api/server-actions", data);
  cache = [request, ...cache];
  emitUpdate();
  return request;
}

export async function updateServerAction(
  id: string,
  updates: Partial<
    Pick<ServerActionRequest, "status" | "adminNote" | "newUsername" | "newPassword">
  >
): Promise<ServerActionRequest> {
  const updated = await apiPatch<ServerActionRequest>(`/api/server-actions/${id}`, updates);
  cache = cache.map((a) => (a.id === id ? updated : a));
  emitUpdate();
  return updated;
}

export async function deleteServerAction(id: string): Promise<void> {
  await apiDelete(`/api/server-actions/${id}`);
  cache = cache.filter((a) => a.id !== id);
  emitUpdate();
}

export function formatActionDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getActionDisplayLabel(action: ServerActionRequest): string {
  if (action.action === "reinstall" && action.reinstallOs) {
    return `Reinstall — ${reinstallOsLabels[action.reinstallOs]}`;
  }
  return serverActionLabels[action.action];
}
