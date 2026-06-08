import type { SupportTicket, TicketPriority, TicketReply } from "@/lib/tickets";
import { getDb } from "@/lib/mongodb";
import { ensureSeeded } from "@/lib/db/seed";

function migrateTicket(raw: Partial<SupportTicket> & { id: string }): SupportTicket {
  const replies: TicketReply[] = raw.replies?.length
    ? raw.replies
    : [
        {
          id: `r-${raw.id}-0`,
          author: "user",
          authorName: raw.userName ?? "User",
          message: raw.message ?? "",
          createdAt: raw.createdAt ?? new Date().toISOString(),
        },
        ...(raw.adminReply
          ? [
              {
                id: `r-${raw.id}-1`,
                author: "admin" as const,
                authorName: "LinuxPro Support",
                message: raw.adminReply,
                createdAt: raw.updatedAt ?? new Date().toISOString(),
              },
            ]
          : []),
      ];

  return {
    id: raw.id,
    subject: raw.subject ?? "",
    message: raw.message ?? "",
    userName: raw.userName ?? "",
    userEmail: raw.userEmail ?? "",
    status: raw.status ?? "open",
    priority: raw.priority ?? "medium",
    adminReply: raw.adminReply ?? "",
    replies,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

async function collection() {
  await ensureSeeded();
  const db = await getDb();
  return db.collection<SupportTicket>("tickets");
}

export async function dbGetTickets(): Promise<SupportTicket[]> {
  const tickets = await (await collection()).find({}).sort({ updatedAt: -1 }).toArray();
  return tickets.map((t) => migrateTicket(t));
}

export async function dbGetTicketById(id: string): Promise<SupportTicket | null> {
  const ticket = await (await collection()).findOne({ id });
  return ticket ? migrateTicket(ticket) : null;
}

export async function dbGetTicketsByUser(email: string): Promise<SupportTicket[]> {
  return (await dbGetTickets()).filter((t) => t.userEmail === email);
}

export async function dbCreateTicket(data: {
  subject: string;
  message: string;
  userName: string;
  userEmail: string;
  priority: TicketPriority;
}): Promise<SupportTicket> {
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `TKT-${Date.now().toString().slice(-6)}`,
    ...data,
    status: "open",
    adminReply: "",
    replies: [
      {
        id: `r-${Date.now()}`,
        author: "user",
        authorName: data.userName,
        message: data.message,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(ticket);
  return ticket;
}

export async function dbAddTicketReply(
  id: string,
  reply: { author: "user" | "admin"; authorName: string; message: string }
): Promise<SupportTicket | null> {
  const ticket = await dbGetTicketById(id);
  if (!ticket) return null;

  const now = new Date().toISOString();
  const newReply: TicketReply = {
    id: `r-${Date.now()}`,
    ...reply,
    createdAt: now,
  };

  const replies = [...ticket.replies, newReply];
  const adminReply = reply.author === "admin" ? reply.message : ticket.adminReply;
  const next: SupportTicket = {
    ...ticket,
    replies,
    adminReply,
    status:
      reply.author === "admin"
        ? "answered"
        : ticket.status === "closed"
          ? "open"
          : ticket.status,
    updatedAt: now,
  };

  await (await collection()).updateOne({ id }, { $set: next });
  return next;
}

export async function dbUpdateTicket(
  id: string,
  updates: Partial<Pick<SupportTicket, "status" | "priority" | "adminReply">>
): Promise<SupportTicket | null> {
  const ticket = await dbGetTicketById(id);
  if (!ticket) return null;

  const now = new Date().toISOString();
  let next: SupportTicket = { ...ticket, ...updates, updatedAt: now };

  if (updates.adminReply !== undefined && updates.adminReply.trim()) {
    const lastReply = next.replies[next.replies.length - 1];
    if (!lastReply || lastReply.author !== "admin" || lastReply.message !== updates.adminReply) {
      next = {
        ...next,
        replies: [
          ...next.replies,
          {
            id: `r-${Date.now()}`,
            author: "admin",
            authorName: "LinuxPro Support",
            message: updates.adminReply,
            createdAt: now,
          },
        ],
      };
    }
  }

  await (await collection()).updateOne({ id }, { $set: next });
  return next;
}

export async function dbDeleteTicket(id: string): Promise<void> {
  await (await collection()).deleteOne({ id });
}
