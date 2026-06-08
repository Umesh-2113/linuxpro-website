import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";

export type TicketStatus = "open" | "answered" | "closed";
export type TicketPriority = "low" | "medium" | "high";

export type TicketReply = {
  id: string;
  author: "user" | "admin";
  authorName: string;
  message: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  userName: string;
  userEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  adminReply: string;
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
};

let cache: SupportTicket[] = [];
let fetchPromise: Promise<SupportTicket[]> | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mergeUserTickets(tickets: SupportTicket[], email: string): void {
  const normalized = normalizeEmail(email);
  const rest = cache.filter((t) => normalizeEmail(t.userEmail) !== normalized);
  cache = [...tickets, ...rest];
}

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tickets-updated"));
  }
}

export async function fetchTickets(email?: string): Promise<SupportTicket[]> {
  const path = email ? `/api/tickets?email=${encodeURIComponent(email)}` : "/api/tickets";
  if (!email && fetchPromise) return fetchPromise;

  const promise = apiGet<SupportTicket[]>(path)
    .then((tickets) => {
      if (email) {
        mergeUserTickets(tickets, email);
        emitUpdate();
        return tickets;
      }
      cache = tickets;
      fetchPromise = null;
      emitUpdate();
      return tickets;
    })
    .catch((err) => {
      if (!email) fetchPromise = null;
      console.error("[fetchTickets]", err);
      return email ? [] : cache;
    });

  if (!email) fetchPromise = promise;
  return promise;
}

export function getTickets(): SupportTicket[] {
  return cache;
}

export function getTicketById(id: string): SupportTicket | null {
  return getTickets().find((t) => t.id === id) ?? null;
}

export function getTicketsByUser(email: string): SupportTicket[] {
  const normalized = normalizeEmail(email);
  return getTickets().filter((t) => normalizeEmail(t.userEmail) === normalized);
}

export function getTicketStats(email?: string) {
  const tickets = email ? getTicketsByUser(email) : getTickets();
  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    answered: tickets.filter((t) => t.status === "answered").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };
}

export async function createTicket(data: {
  subject: string;
  message: string;
  userName: string;
  userEmail: string;
  priority: TicketPriority;
}): Promise<SupportTicket> {
  const ticket = await apiPost<SupportTicket>("/api/tickets", data);
  cache = [ticket, ...cache];
  emitUpdate();
  return ticket;
}

export async function addTicketReply(
  id: string,
  reply: { author: "user" | "admin"; authorName: string; message: string }
): Promise<SupportTicket | null> {
  try {
    const ticket = await apiPost<SupportTicket>(`/api/tickets/${id}/reply`, reply);
    cache = cache.map((t) => (t.id === id ? ticket : t));
    emitUpdate();
    return ticket;
  } catch {
    return null;
  }
}

export async function updateTicket(
  id: string,
  updates: Partial<Pick<SupportTicket, "status" | "priority" | "adminReply">>
): Promise<SupportTicket | null> {
  try {
    const ticket = await apiPatch<SupportTicket>(`/api/tickets/${id}`, updates);
    cache = cache.map((t) => (t.id === id ? ticket : t));
    emitUpdate();
    return ticket;
  } catch {
    return null;
  }
}

export async function closeTicket(id: string): Promise<SupportTicket | null> {
  return updateTicket(id, { status: "closed" });
}

export async function deleteTicket(id: string): Promise<void> {
  await apiDelete(`/api/tickets/${id}`);
  cache = cache.filter((t) => t.id !== id);
  emitUpdate();
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function getTicketRelativeTime(ticket: SupportTicket): string {
  return formatRelative(ticket.updatedAt);
}

export function formatTicketDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
