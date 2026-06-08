import type { ServerActionRequest } from "@/lib/server-actions";
import { getCollection } from "@/lib/mongodb";

async function collection() {
  return getCollection<ServerActionRequest>("server_actions");
}

function normalizeAction(action: ServerActionRequest): ServerActionRequest {
  if (action.action !== "start" && action.action !== "stop" && action.action !== "reinstall") {
    return { ...action, action: "reinstall" };
  }
  return action;
}

export async function dbGetServerActions(): Promise<ServerActionRequest[]> {
  const actions = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return actions.map(normalizeAction);
}

export async function dbGetActionsByUser(email: string): Promise<ServerActionRequest[]> {
  return (await dbGetServerActions()).filter((a) => a.userEmail === email);
}

export async function dbGetActionsByServer(serverId: string): Promise<ServerActionRequest[]> {
  return (await dbGetServerActions()).filter((a) => a.serverId === serverId);
}

export async function dbCreateServerAction(
  data: Omit<ServerActionRequest, "id" | "status" | "adminNote" | "createdAt" | "updatedAt">
): Promise<ServerActionRequest> {
  const now = new Date().toISOString();
  const request: ServerActionRequest = {
    ...data,
    id: `ACT-${Date.now().toString().slice(-6)}`,
    status: "pending",
    adminNote: "",
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(request);
  return request;
}

export async function dbUpdateServerAction(
  id: string,
  updates: Partial<
    Pick<ServerActionRequest, "status" | "adminNote" | "newUsername" | "newPassword">
  >
): Promise<ServerActionRequest | null> {
  const col = await collection();
  const existing = await col.findOne({ id });
  if (!existing) return null;
  const next = normalizeAction({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await col.updateOne({ id }, { $set: next });
  return next;
}

export async function dbDeleteServerAction(id: string): Promise<void> {
  await (await collection()).deleteOne({ id });
}
